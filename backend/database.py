"""
Expense Autopilot In-Memory & Persisted SQLite/JSON Database
Provides thread-safe access to Employees, Trips, Policies, Receipts,
Expenses, Decision Versions, Duplicates, Risk Alerts, and Audit Events.
"""
import json
import os
import threading
from typing import Dict, List, Optional, Any
from copy import deepcopy

DATA_DIR = os.path.dirname(os.path.abspath(__file__))
DB_FILE = os.path.join(DATA_DIR, "db_storage.json")

class Database:
    def __init__(self):
        self._lock = threading.Lock()
        self.employees: Dict[str, dict] = {}
        self.trips: Dict[str, dict] = {}
        self.policy_rules: Dict[str, dict] = {}
        self.receipts: Dict[str, dict] = {}
        self.expenses: Dict[str, dict] = {}
        self.duplicate_candidates: Dict[str, dict] = {}
        self.risk_alerts: Dict[str, dict] = {}
        self.audit_events: List[dict] = []
        self.users: Dict[str, dict] = {}
        self.policy_document_metadata: dict = {
            "title": "Global Acme Corp Corporate Expense & Travel Policy",
            "version": "2026.4",
            "effective_date": "2026-01-01",
            "last_updated": "2026-10-01",
            "approval_matrix": {
                "Standard": "Direct Manager",
                "Tier1_OverLimit": "Department Head",
                "Over_5000": "Vice President / Finance Director"
            }
        }
        self.load()

    def save(self):
        with self._lock:
            data = {
                "employees": self.employees,
                "trips": self.trips,
                "policy_rules": self.policy_rules,
                "receipts": self.receipts,
                "expenses": self.expenses,
                "duplicate_candidates": self.duplicate_candidates,
                "risk_alerts": self.risk_alerts,
                "audit_events": self.audit_events,
                "users": self.users,
                "policy_document_metadata": self.policy_document_metadata
            }
            try:
                with open(DB_FILE, "w", encoding="utf-8") as f:
                    json.dump(data, f, indent=2)
            except Exception as e:
                print(f"[DB] Error persisting to file: {e}")

    def load(self):
        with self._lock:
            if os.path.exists(DB_FILE):
                try:
                    with open(DB_FILE, "r", encoding="utf-8") as f:
                        data = json.load(f)
                    self.employees = data.get("employees", {})
                    self.trips = data.get("trips", {})
                    self.policy_rules = data.get("policy_rules", {})
                    self.receipts = data.get("receipts", {})
                    self.expenses = data.get("expenses", {})
                    self.duplicate_candidates = data.get("duplicate_candidates", {})
                    self.risk_alerts = data.get("risk_alerts", {})
                    self.audit_events = data.get("audit_events", [])
                    self.users = data.get("users", {})
                    self.policy_document_metadata = data.get("policy_document_metadata", self.policy_document_metadata)
                except Exception as e:
                    print(f"[DB] Error loading DB: {e}")

    # EMPLOYEES
    def list_employees(self) -> List[dict]:
        with self._lock:
            return list(self.employees.values())

    def get_employee(self, emp_id: str) -> Optional[dict]:
        with self._lock:
            return deepcopy(self.employees.get(emp_id))

    def set_employee(self, emp: dict):
        with self._lock:
            self.employees[emp["id"]] = emp
        self.save()

    # TRIPS
    def list_trips(self) -> List[dict]:
        with self._lock:
            return list(self.trips.values())

    def get_trip(self, trip_id: str) -> Optional[dict]:
        with self._lock:
            return deepcopy(self.trips.get(trip_id))

    def set_trip(self, trip: dict):
        with self._lock:
            self.trips[trip["id"]] = trip
        self.save()

    # POLICIES
    def list_policy_rules(self) -> List[dict]:
        with self._lock:
            return list(self.policy_rules.values())

    def get_policy_rule(self, rule_id: str) -> Optional[dict]:
        with self._lock:
            return deepcopy(self.policy_rules.get(rule_id))

    def set_policy_rule(self, rule: dict):
        with self._lock:
            self.policy_rules[rule["rule_id"]] = rule
        self.save()

    # RECEIPTS
    def list_receipts(self) -> List[dict]:
        with self._lock:
            return list(self.receipts.values())

    def get_receipt(self, receipt_id: str) -> Optional[dict]:
        with self._lock:
            return deepcopy(self.receipts.get(receipt_id))

    def set_receipt(self, receipt: dict):
        with self._lock:
            self.receipts[receipt["receipt_id"]] = receipt
        self.save()

    # EXPENSES
    def list_expenses(self) -> List[dict]:
        with self._lock:
            return list(self.expenses.values())

    def get_expense(self, expense_id: str) -> Optional[dict]:
        with self._lock:
            return deepcopy(self.expenses.get(expense_id))

    def set_expense(self, expense: dict):
        with self._lock:
            self.expenses[expense["id"]] = expense
        self.save()

    def delete_expense(self, expense_id: str):
        with self._lock:
            if expense_id in self.expenses:
                del self.expenses[expense_id]
        self.save()

    # DUPLICATES
    def list_duplicates(self) -> List[dict]:
        with self._lock:
            return list(self.duplicate_candidates.values())

    def get_duplicate(self, dup_id: str) -> Optional[dict]:
        with self._lock:
            return deepcopy(self.duplicate_candidates.get(dup_id))

    def set_duplicate(self, dup: dict):
        with self._lock:
            self.duplicate_candidates[dup["id"]] = dup
        self.save()

    # RISK ALERTS
    def list_risk_alerts(self) -> List[dict]:
        with self._lock:
            return list(self.risk_alerts.values())

    def get_risk_alert(self, alert_id: str) -> Optional[dict]:
        with self._lock:
            return deepcopy(self.risk_alerts.get(alert_id))

    def set_risk_alert(self, alert: dict):
        with self._lock:
            self.risk_alerts[alert["id"]] = alert
        self.save()

    # AUDIT TRAIL
    def list_audit_events(self) -> List[dict]:
        with self._lock:
            return list(self.audit_events)

    def add_audit_event(self, event: dict):
        with self._lock:
            self.audit_events.insert(0, event)
            # Keep up to 1000 events
            if len(self.audit_events) > 1000:
                self.audit_events = self.audit_events[:1000]
        self.save()

    # USERS & AUTH
    def list_users(self) -> List[dict]:
        with self._lock:
            return list(self.users.values())

    def get_user(self, user_id: str) -> Optional[dict]:
        with self._lock:
            return deepcopy(self.users.get(user_id))

    def get_user_by_email(self, email: str) -> Optional[dict]:
        with self._lock:
            norm_email = email.strip().lower()
            for u in self.users.values():
                if u.get("email", "").strip().lower() == norm_email:
                    return deepcopy(u)
            return None

    def get_user_by_reset_token(self, token: str) -> Optional[dict]:
        with self._lock:
            for u in self.users.values():
                if u.get("reset_token") == token:
                    return deepcopy(u)
            return None

    def set_user(self, user: dict):
        with self._lock:
            self.users[user["id"]] = user
        self.save()

    def delete_user(self, user_id: str):
        with self._lock:
            if user_id in self.users:
                del self.users[user_id]
        self.save()

    def clear_all(self, preserve_users: bool = True):
        with self._lock:
            self.employees.clear()
            self.trips.clear()
            self.policy_rules.clear()
            self.receipts.clear()
            self.expenses.clear()
            self.duplicate_candidates.clear()
            self.risk_alerts.clear()
            self.audit_events.clear()
            if not preserve_users:
                self.users.clear()
        self.save()

db = Database()
