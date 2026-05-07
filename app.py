"""TAP Map Builder - FastAPI application."""

import json
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from server.db import (
    init_table, list_accounts, list_all_accounts, get_tap_map, upsert_tap_map, delete_tap_map,
    get_account_metadata, upsert_account_metadata,
)
from server.approval import (
    init_approval_table, get_approval, get_approval_by_token,
    submit_for_approval, approve_tap, reject_tap,
    send_review_request, send_approval_decision,
    reset_approval_to_draft, delete_approval,
)
from server.models import TapMapSaveRequest, AccountMetadata, SubmitApprovalRequest, RejectRequest
from server.tap_structure import TAP_STRUCTURE
from server.salesforce import get_current_user, get_sa_accounts, get_account_spend, get_manager
from server.config import IS_DATABRICKS_APP


def _get_user_from_request(request: Request) -> dict:
    """Extract user identity from Databricks App proxy headers, fallback to SDK."""
    if IS_DATABRICKS_APP:
        email = request.headers.get("X-Forwarded-Email", "")
        name = request.headers.get("X-Forwarded-Preferred-Username", email.split("@")[0] if email else "")
        if email:
            return {"email": email, "display_name": name, "user_id": ""}
    return get_current_user()


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_table()
    init_approval_table()
    yield


app = FastAPI(title="TAP Map Builder", lifespan=lifespan)

@app.get("/api/me")
def api_me(request: Request):
    return _get_user_from_request(request)

@app.get("/api/me/manager")
def api_me_manager(request: Request):
    try:
        user = _get_user_from_request(request)
        email = user.get("email", "")
        if not email:
            return {"manager_email": "", "manager_name": "", "manager_title": ""}
        return get_manager(email)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/salesforce/accounts")
def api_salesforce_accounts(request: Request):
    user = _get_user_from_request(request)
    accounts = get_sa_accounts(
        user_display_name=user.get("display_name", ""),
        user_email=user.get("email", ""),
    )
    return {"accounts": accounts, "user": user}

@app.get("/api/salesforce/account-spend/{account_name}")
def api_account_spend(account_name: str):
    try:
        return get_account_spend(account_name)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/structure")
def get_structure():
    return TAP_STRUCTURE

@app.get("/api/accounts")
def api_list_accounts(request: Request):
    try:
        user = _get_user_from_request(request)
        return {"accounts": list_accounts(created_by=user.get("email", ""))}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/accounts/all")
def api_list_all_accounts():
    try:
        return {"accounts": list_all_accounts()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/tap-map/{account_name}/metadata")
def api_get_metadata(account_name: str):
    try:
        return get_account_metadata(account_name)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/tap-map/{account_name}/metadata")
def api_save_metadata(request: Request, account_name: str, body: AccountMetadata):
    try:
        user = _get_user_from_request(request)
        upsert_account_metadata(
            account_name,
            [p.model_dump() for p in body.responsible],
            [p.model_dump() for p in body.consulted],
            [p.model_dump() for p in body.informed],
            updated_by=user.get("email", ""),
        )
        return {"status": "ok"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/tap-map/{account_name}")
def api_get_tap_map(account_name: str):
    try:
        entries = get_tap_map(account_name)
        for entry in entries:
            if entry.get("tools_in_use"):
                try:
                    entry["tools_in_use"] = json.loads(entry["tools_in_use"])
                except (json.JSONDecodeError, TypeError):
                    entry["tools_in_use"] = []
            else:
                entry["tools_in_use"] = []
            na = entry.get("not_applicable")
            if isinstance(na, str):
                entry["not_applicable"] = na.lower() in ("true", "1", "yes")
            for field in ("exec_buyer", "budget", "notes", "primary_tool"):
                if entry.get(field) is None:
                    entry[field] = ""
        return {"account_name": account_name, "entries": entries}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/tap-map/{account_name}")
def api_save_tap_map(http_request: Request, account_name: str, request: TapMapSaveRequest):
    try:
        user = _get_user_from_request(http_request)
        upsert_tap_map(account_name, [e.model_dump() for e in request.entries],
                       updated_by=user.get("email", ""))
        reset_approval_to_draft(account_name)
        return {"status": "ok", "account_name": account_name}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/tap-map/{account_name}")
def api_delete_tap_map(request: Request, account_name: str):
    try:
        user = _get_user_from_request(request)
        delete_tap_map(account_name, deleted_by=user.get("email", ""))
        delete_approval(account_name)
        return {"status": "ok", "account_name": account_name}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ── Approval workflow ─────────────────────────────────────────────────────────

@app.get("/api/tap-map/{account_name}/approval")
def api_get_approval(account_name: str):
    try:
        result = get_approval(account_name)
        return result if result else {"status": "draft", "account_name": account_name}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/tap-map/{account_name}/submit")
def api_submit_approval(request: Request, account_name: str, body: SubmitApprovalRequest):
    try:
        user = _get_user_from_request(request)
        submitted_by = user.get("display_name") or user.get("email", "unknown")
        token = submit_for_approval(account_name, user.get("email", ""), body.manager_email)
        send_review_request(body.manager_email, account_name, submitted_by, token)
        return {"status": "pending", "token": token}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/review/{token}")
def api_get_review(request: Request, token: str):
    try:
        approval = get_approval_by_token(token)
        if not approval:
            raise HTTPException(status_code=404, detail="Token não encontrado ou expirado.")
        user = _get_user_from_request(request)
        reviewer = user.get("email", "")
        expected = approval.get("manager_email", "")
        if expected and reviewer.lower() != expected.lower():
            raise HTTPException(status_code=403, detail=f"Apenas {expected} pode revisar este TAP Map.")
        return approval
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/review/{token}/approve")
def api_approve(request: Request, token: str):
    try:
        approval = get_approval_by_token(token)
        if not approval:
            raise HTTPException(status_code=404, detail="Token não encontrado ou expirado.")
        user = _get_user_from_request(request)
        reviewer = user.get("email", "")
        expected = approval.get("manager_email", "")
        if expected and reviewer.lower() != expected.lower():
            raise HTTPException(status_code=403, detail=f"Apenas {expected} pode revisar este TAP Map.")
        result = approve_tap(token, reviewer)
        send_approval_decision(
            result["submitted_by"], result["account_name"],
            "approved", reviewer,
        )
        return {"status": "approved", "account_name": result["account_name"]}
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/review/{token}/reject")
def api_reject(request: Request, token: str, body: RejectRequest):
    try:
        approval = get_approval_by_token(token)
        if not approval:
            raise HTTPException(status_code=404, detail="Token não encontrado ou expirado.")
        user = _get_user_from_request(request)
        reviewer = user.get("email", "")
        expected = approval.get("manager_email", "")
        if expected and reviewer.lower() != expected.lower():
            raise HTTPException(status_code=403, detail=f"Apenas {expected} pode revisar este TAP Map.")
        result = reject_tap(token, reviewer, body.comments)
        send_approval_decision(
            result["submitted_by"], result["account_name"],
            "rejected", reviewer, body.comments,
        )
        return {"status": "rejected", "account_name": result["account_name"]}
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


frontend_dist = Path(__file__).parent / "frontend" / "dist"

if frontend_dist.exists():
    app.mount("/assets", StaticFiles(directory=frontend_dist / "assets"), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="Not found")
        file_path = frontend_dist / full_path
        if file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(frontend_dist / "index.html")
else:
    @app.get("/")
    async def root():
        return {"message": "TAP Map Builder API. Run `npm run build` in frontend/."}
