import sys
import json
import sqlite3
import os
from datetime import datetime

DB_PATH = os.path.join(os.getcwd(), "leads.db")

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS leads (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            income REAL NOT NULL,
            phone TEXT NOT NULL,
            aadhaar TEXT NOT NULL,
            pan TEXT NOT NULL,
            status TEXT NOT NULL,
            created_at TEXT NOT NULL,
            lead_type TEXT,
            cm TEXT,
            sub_status TEXT,
            rejection_reason TEXT,
            custom_rejection TEXT
        )
    """)
    conn.commit()

    # Migration for existing databases to ensure the new columns exist
    new_columns = [
        ("lead_type", "TEXT"),
        ("cm", "TEXT"),
        ("sub_status", "TEXT"),
        ("rejection_reason", "TEXT"),
        ("custom_rejection", "TEXT")
    ]
    for col_name, col_type in new_columns:
        try:
            cursor.execute(f"ALTER TABLE leads ADD COLUMN {col_name} {col_type}")
            conn.commit()
        except sqlite3.OperationalError:
            # Column already exists
            pass
    
    # Check if empty, then seed
    cursor.execute("SELECT COUNT(*) as count FROM leads")
    row = cursor.fetchone()
    if row["count"] == 0:
        today = datetime.utcnow().isoformat() + "Z"
        # Seed some records
        initial_leads = [
            ("John Doe", 75000.0, "+91 98765 43210", "1234-5678-9012", "ABCDE1234F", "New", today, "Fresh", "CM_John", "New", None, None),
            ("Jane Smith", 95000.0, "+91 87654 32109", "2345-6789-0123", "FGHIJ5678K", "Contacted", today, "Repeat", "CM_Jane", None, None, None),
            ("Rahul Kumar", 60000.0, "+91 76543 20987", "3456-7890-1234", "KLMNO9012P", "Rejected", today, "Fresh", "CM_Rahul", None, "Other", "Company blacklisted"),
            ("Priya Sharma", 120000.0, "+91 65432 10987", "4567-8901-2345", "QRSTU3456V", "Qualified", today, "Repeat", "CM_Priya", None, None, None),
            ("Amit Patel", 85000.0, "+91 91234 56789", "5678-9012-3456", "VWXYZ7890A", "Rejected", today, "Fresh", "CM_Amit", None, "CIBIL low", None)
        ]
        cursor.executemany("""
            INSERT INTO leads (name, income, phone, aadhaar, pan, status, created_at, lead_type, cm, sub_status, rejection_reason, custom_rejection)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, initial_leads)
        conn.commit()
    else:
        # For existing databases, migrate specific seeded leads to the new Rejected status to show off the functionality
        cursor.execute("UPDATE leads SET status = 'Rejected', rejection_reason = 'CIBIL low' WHERE name = 'Amit Patel' AND status = 'Lost'")
        cursor.execute("UPDATE leads SET status = 'Rejected', rejection_reason = 'Other', custom_rejection = 'Company blacklisted' WHERE name = 'Rahul Kumar' AND status = 'In Progress'")
        conn.commit()
    conn.close()

def dict_from_row(row):
    if row is None:
        return None
    return dict(row)

def handle_request():
    try:
        input_data = sys.stdin.read()
        if not input_data:
            return {"error": "Empty input"}
        
        req = json.loads(input_data)
        action = req.get("action")
        
        if action == "init":
            init_db()
            return {"data": "Database initialized"}
            
        conn = get_db()
        cursor = conn.cursor()
        
        if action == "metrics":
            # Get total count
            cursor.execute("SELECT COUNT(*) as total FROM leads")
            total = cursor.fetchone()["total"]
            
            # Get all to calculate added today using server date comparison (similar to Node server logic)
            cursor.execute("SELECT created_at FROM leads")
            rows = cursor.fetchall()
            
            today_str = datetime.utcnow().strftime("%Y-%m-%d")
            added_today = 0
            for r in rows:
                c_at = r["created_at"]
                if c_at and c_at.split("T")[0] == today_str:
                    added_today += 1
                    
            return {"data": {"totalCount": total, "addedToday": added_today}}
            
        elif action == "list":
            cursor.execute("SELECT * FROM leads ORDER BY id DESC")
            rows = cursor.fetchall()
            return {"data": [dict_from_row(r) for r in rows]}
            
        elif action == "get":
            lead_id = req.get("id")
            cursor.execute("SELECT * FROM leads WHERE id = ?", (lead_id,))
            row = cursor.fetchone()
            if row is None:
                return {"error": "Lead not found", "code": 404}
            return {"data": dict_from_row(row)}
            
        elif action == "create":
            lead_data = req.get("data")
            created_at = datetime.utcnow().isoformat() + "Z"
            cursor.execute("""
                INSERT INTO leads (name, income, phone, aadhaar, pan, status, created_at, lead_type, cm, sub_status, rejection_reason, custom_rejection)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                lead_data["name"],
                float(lead_data["income"]),
                lead_data["phone"],
                lead_data["aadhaar"],
                lead_data["pan"],
                lead_data["status"],
                created_at,
                lead_data.get("lead_type"),
                lead_data.get("cm"),
                lead_data.get("sub_status"),
                lead_data.get("rejection_reason"),
                lead_data.get("custom_rejection")
            ))
            conn.commit()
            new_id = cursor.lastrowid
            
            # Fetch the newly created row
            cursor.execute("SELECT * FROM leads WHERE id = ?", (new_id,))
            new_row = cursor.fetchone()
            return {"data": dict_from_row(new_row)}
            
        elif action == "update":
            lead_id = req.get("id")
            lead_data = req.get("data")
            cursor.execute("""
                UPDATE leads
                SET name = ?, income = ?, phone = ?, aadhaar = ?, pan = ?, status = ?, lead_type = ?, cm = ?, sub_status = ?, rejection_reason = ?, custom_rejection = ?
                WHERE id = ?
            """, (
                lead_data["name"],
                float(lead_data["income"]),
                lead_data["phone"],
                lead_data["aadhaar"],
                lead_data["pan"],
                lead_data["status"],
                lead_data.get("lead_type"),
                lead_data.get("cm"),
                lead_data.get("sub_status"),
                lead_data.get("rejection_reason"),
                lead_data.get("custom_rejection"),
                lead_id
            ))
            conn.commit()
            if cursor.rowcount == 0:
                return {"error": "Lead not found or no changes made", "code": 404}
                
            # Fetch the updated row
            cursor.execute("SELECT * FROM leads WHERE id = ?", (lead_id,))
            updated_row = cursor.fetchone()
            return {"data": dict_from_row(updated_row)}
            
        elif action == "delete":
            lead_id = req.get("id")
            cursor.execute("DELETE FROM leads WHERE id = ?", (lead_id,))
            conn.commit()
            if cursor.rowcount == 0:
                return {"error": "Lead not found", "code": 404}
            return {"data": {"message": "Lead deleted successfully", "id": lead_id}}
            
        else:
            return {"error": f"Unknown action: {action}"}
            
        conn.close()
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    res = handle_request()
    print(json.dumps(res))
