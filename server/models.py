"""Pydantic models for TAP Map API."""

from typing import Optional
from pydantic import BaseModel


class RaciPerson(BaseModel):
    role: str = ""
    name: str = ""


class TapMapEntry(BaseModel):
    section: str
    subsection: str
    tools_in_use: list[str] = []
    primary_tool: str = ""
    exec_buyer: str = ""
    budget: str = ""
    notes: str = ""
    not_applicable: bool = False


class TapMapSaveRequest(BaseModel):
    entries: list[TapMapEntry]


class AccountMetadata(BaseModel):
    responsible: list[RaciPerson] = []
    consulted: list[RaciPerson] = []
    informed: list[RaciPerson] = []


class AccountSummary(BaseModel):
    account_name: str
    last_updated: Optional[str] = None
    sections_filled: int = 0


class SubmitApprovalRequest(BaseModel):
    manager_email: str


class RejectRequest(BaseModel):
    comments: str
