from firebase_admin import firestore

def get_firestore_client():
    return firestore.client()

def save_report(report_data: dict):
    """Save a report to the 'reports' collection."""
    db = get_firestore_client()
    try:
        doc_ref = db.collection("reports").document()
        report_data["reportId"] = doc_ref.id
        doc_ref.set(report_data)
        return doc_ref.id
    except Exception as e:
        print(f"Error saving report to Firestore: {e}")
        return None

def save_document_metadata(doc_data: dict):
    """Save document metadata to the 'documents' collection."""
    db = get_firestore_client()
    try:
        _, doc_ref = db.collection("documents").add(doc_data)
        return doc_ref.id
    except Exception as e:
        print(f"Error saving document to Firestore: {e}")
        return None
