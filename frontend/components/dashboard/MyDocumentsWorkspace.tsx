"use client";

import React, { useEffect, useState } from "react";
import { collection, query, where, getDocs, orderBy, deleteDoc, doc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { FolderOpen, Search, Trash2, FileText, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function MyDocumentsWorkspace() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchDocuments();
  }, [auth.currentUser]);

  const fetchDocuments = async () => {
    if (!auth.currentUser) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, "documents"),
        where("ownerUid", "==", auth.currentUser.uid),
        orderBy("createdAt", "desc")
      );
      const querySnapshot = await getDocs(q);
      const fetchedDocs: any[] = [];
      querySnapshot.forEach((doc) => {
        fetchedDocs.push({ id: doc.id, ...doc.data() });
      });
      setDocuments(fetchedDocs);
    } catch (error: any) {
      console.error("Error fetching documents:", error);
      toast.error("Failed to fetch documents: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this document from your library?")) return;
    
    try {
      await deleteDoc(doc(db, "documents", id));
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      toast.success("Document removed successfully");
    } catch (error) {
      toast.error("Failed to delete document");
    }
  };

  const filteredDocs = documents.filter((d) => 
    d.fileName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.fileType?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-zinc-950 p-6 md:p-8 overflow-y-auto custom-scrollbar">
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
            <FolderOpen className="w-6 h-6 text-indigo-400" />
            My Documents
          </h1>
          <p className="text-sm text-zinc-400 mt-2">
            Manage your personal enterprise knowledge base and uploaded files.
          </p>
        </div>
      </div>

      <div className="mb-6 relative max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
        <input 
          type="text" 
          placeholder="Search documents by name or type..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-4 py-2 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      ) : filteredDocs.length === 0 ? (
        <div className="text-center py-20 bg-zinc-900/30 rounded-xl border border-dashed border-zinc-800">
          <FolderOpen className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-zinc-300">No Documents Found</h3>
          <p className="text-zinc-500 text-sm mt-1">Upload documents via the Command Center to see them here.</p>
        </div>
      ) : (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm text-zinc-400">
            <thead className="bg-zinc-900 border-b border-zinc-800 text-zinc-300">
              <tr>
                <th className="px-6 py-4 font-medium">File Name</th>
                <th className="px-6 py-4 font-medium">Type</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Upload Date</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {filteredDocs.map((doc) => (
                <tr key={doc.id} className="hover:bg-zinc-800/30 transition-colors">
                  <td className="px-6 py-4 flex items-center gap-3 text-zinc-200 font-medium">
                    <FileText className="w-4 h-4 text-indigo-400" />
                    <span className="truncate max-w-[200px]">{doc.fileName}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-mono bg-zinc-800 text-zinc-300 px-2 py-1 rounded">
                      {doc.fileType}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {doc.ingestionStatus === "indexed" ? (
                      <span className="flex items-center gap-1.5 text-emerald-400 text-xs font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Indexed ({doc.chunkCount} chunks)
                      </span>
                    ) : doc.ingestionStatus === "skipped" ? (
                      <span className="flex items-center gap-1.5 text-amber-400 text-xs font-medium">
                        <AlertTriangle className="w-3.5 h-3.5" /> Skipped
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-zinc-400 text-xs font-medium">
                        <Clock className="w-3.5 h-3.5" /> Processing
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-xs font-mono">
                    {new Date(doc.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => handleDelete(doc.id)}
                      className="text-zinc-500 hover:text-red-400 transition-colors p-1.5 rounded hover:bg-zinc-800 inline-flex"
                      title="Delete document"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
