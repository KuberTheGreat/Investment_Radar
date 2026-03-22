import os
import chromadb

class RAGManager:
    def __init__(self, db_path: str = "/app/data/chroma_db"):
        os.makedirs(db_path, exist_ok=True)
        self.client = chromadb.PersistentClient(path=db_path)
        self.collection = self.client.get_or_create_collection(name="fundamentals")

    def ingest_document(self, document_id: str, text: str, metadata: dict = None):
        """
        Ingests a large string of text (e.g., earnings transcript) into ChromaDB.
        Splits text into smaller chunks for better retrieval.
        """
        chunk_size = 500
        chunks = [text[i:i+chunk_size] for i in range(0, len(text), chunk_size)]
        
        ids = [f"{document_id}_chunk_{i}" for i in range(len(chunks))]
        metadatas = [metadata or {"doc_id": document_id}] * len(chunks)
        
        self.collection.upsert(
            documents=chunks,
            metadatas=metadatas,
            ids=ids
        )
        return len(chunks)

    def query(self, query_text: str, n_results: int = 3) -> str:
        """
        Queries the database for the most semantically similar text chunks.
        """
        try:
            results = self.collection.query(
                query_texts=[query_text],
                n_results=n_results
            )
            
            if not results['documents'] or not results['documents'][0]:
                return "No relevant fundamental context found in database."
                
            formatted_context = "--- RELEVANT INTERNAL DOCUMENTS ---\n"
            for i, doc in enumerate(results['documents'][0]):
                formatted_context += f"[Excerpt {i+1}]: {doc}\n\n"
            
            return formatted_context
        except Exception as e:
            return f"Error querying RAG database: {str(e)}"
