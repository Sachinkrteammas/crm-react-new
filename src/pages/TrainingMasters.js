
// import React, { useState } from "react";
// import { useParams } from "react-router-dom";
// import { uploadTrainingDocs } from "../services/authService";

// export default function ManageTrainingDocs() {
//   const { clientId } = useParams(); // <-- get client_id from Aband Call page
//   const [files, setFiles] = useState([{ file: null, description: "" }]);
//   const [loading, setLoading] = useState(false);

//   const handleFileChange = (index, e) => {
//     const newFiles = [...files];
//     newFiles[index].file = e.target.files[0];
//     setFiles(newFiles);
//   };

//   const handleDescriptionChange = (index, e) => {
//     const newFiles = [...files];
//     newFiles[index].description = e.target.value;
//     setFiles(newFiles);
//   };

//   const addField = () => {
//     if (files.length >= 10) return; 
//     setFiles([...files, { file: null, description: "" }]);
//   };

//   const removeField = (index) => {
//     const newFiles = files.filter((_, i) => i !== index);
//     setFiles(newFiles);
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     if (!clientId) {
//       alert("Client ID is required");
//       return;
//     }
//     if (!files.some((f) => f.file)) {
//       alert("Please select at least one file to upload");
//       return;
//     }

//     const selectedFiles = files.map((f) => f.file);
//     const descriptions = files.map((f) => f.description);

//     setLoading(true);
//     try {
//       const response = await uploadTrainingDocs(clientId, selectedFiles, descriptions);
//       alert("Upload successful!");
//       setFiles([{ file: null, description: "" }]);
//     } catch (err) {
//       console.error("Upload error:", err);
//       alert(err || "Upload failed");
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="p-4 border rounded-lg bg-white shadow-md">
//       <h5 className="mb-5">
//         Manage Training Docs 
//       </h5>
//       <form onSubmit={handleSubmit}>
//         {files.map((f, index) => (
//           <div key={index} className="mb-4">
//             <div className="flex items-center gap-2">
//               <input
//                 type="file"
//                 accept=".jpg,.jpeg,.png,.gif,.xlsx,.xls,.doc,.docx,.pdf"
//                 onChange={(e) => handleFileChange(index, e)}
//                 className="border p-1 rounded w-full"
//               />
//               {index === 0 ? (
//                 <button
//                   type="button"
//                   className="btn btn-success w-10 h-10 flex items-center justify-center text-2xl"
//                   onClick={addField}
//                 >
//                   +
//                 </button>
//               ) : (
//                 <button
//                   type="button"
//                   className="btn btn-danger w-10 h-10 flex items-center justify-center text-2xl"
//                   onClick={() => removeField(index)}
//                 >
//                   -
//                 </button>
//               )}
//             </div>
//             <input
//               type="text"
//               placeholder="Description"
//               value={f.description}
//               onChange={(e) => handleDescriptionChange(index, e)}
//               className="mt-3 border p-2 rounded w-full"
//             />
//           </div>
//         ))}
//         <p className="text-sm text-gray-500 mb-3">
//           Note - (Upload only image, excel, msword, pdf)
//         </p>
//         <button type="submit" className="btn btn-primary" disabled={loading}>
//           {loading ? "Uploading..." : "Upload"}
//         </button>
//       </form>
//     </div>
//   );
// }











// import React, { useState, useEffect } from "react";
// import { useParams } from "react-router-dom";
// import { uploadTrainingDocs, getTrainingDocs, deleteTrainingDoc } from "../services/authService";

// export default function ManageTrainingDocs() {
//   const { clientId } = useParams(); 
//   const [files, setFiles] = useState([{ file: null, description: "" }]);
//   const [trainingDocs, setTrainingDocs] = useState([]);
//   const [loading, setLoading] = useState(false);

//   // ------------------ Fetch Training Docs ------------------
//   const fetchTrainingDocs = async () => {
//     if (!clientId) return;
//     try {
//       const docs = await getTrainingDocs(clientId);
//       // Map backend 'createdate' to frontend 'createdatetimestamp'
//       const mappedDocs = docs.map(doc => ({
//         ...doc,
//         createdatetimestamp: doc.createdate
//       }));
//       setTrainingDocs(mappedDocs);
//     } catch (err) {
//       console.error("Error fetching training docs:", err);
//     }
//   };

//   useEffect(() => {
//     fetchTrainingDocs();
//   }, [clientId]);

//   // ------------------ File Handlers ------------------
//   const handleFileChange = (index, e) => {
//     const newFiles = [...files];
//     newFiles[index].file = e.target.files[0];
//     setFiles(newFiles);
//   };

//   const handleDescriptionChange = (index, e) => {
//     const newFiles = [...files];
//     newFiles[index].description = e.target.value;
//     setFiles(newFiles);
//   };

//   const addField = () => {
//     if (files.length >= 10) return; 
//     setFiles([...files, { file: null, description: "" }]);
//   };

//   const removeField = (index) => {
//     const newFiles = files.filter((_, i) => i !== index);
//     setFiles(newFiles);
//   };

//   // ------------------ Upload Handler ------------------
//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     if (!clientId) {
//       alert("Client ID is required");
//       return;
//     }
//     if (!files.some(f => f.file)) {
//       alert("Please select at least one file to upload");
//       return;
//     }

//     const selectedFiles = files.map(f => f.file);
//     const descriptions = files.map(f => f.description);

//     setLoading(true);
//     try {
//       await uploadTrainingDocs(clientId, selectedFiles, descriptions);
//       alert("Upload successful!");
//       setFiles([{ file: null, description: "" }]);
//       fetchTrainingDocs(); // Refresh list
//     } catch (err) {
//       console.error("Upload error:", err);
//       alert(err || "Upload failed");
//     } finally {
//       setLoading(false);
//     }
//   };

//   // ------------------ Delete Handler ------------------
//   const handleDelete = async (id) => {
//     if (!window.confirm("Are you sure you want to delete this training doc?")) return;
//     try {
//       await deleteTrainingDoc(id);
//       alert("Deleted successfully!");
//       fetchTrainingDocs(); // Refresh list
//     } catch (err) {
//       console.error("Delete error:", err);
//       alert(err || "Delete failed");
//     }
//   };

//   return (
//     <div className="p-4 border rounded-lg bg-white shadow-md">
//       <h5 className="mb-5">Manage Training Docs</h5>

//       {/* Upload Form */}
//       <form onSubmit={handleSubmit}>
//         {files.map((f, index) => (
//           <div key={index} className="mb-4">
//             <div className="flex items-center gap-2">
//               <input
//                 type="file"
//                 accept=".jpg,.jpeg,.png,.gif,.xlsx,.xls,.doc,.docx,.pdf"
//                 onChange={(e) => handleFileChange(index, e)}
//                 className="border p-1 rounded w-full"
//               />
//               {index === 0 ? (
//                 <button
//                   type="button"
//                   className="btn btn-success w-10 h-10 flex items-center justify-center text-2xl"
//                   onClick={addField}
//                 >
//                   +
//                 </button>
//               ) : (
//                 <button
//                   type="button"
//                   className="btn btn-danger w-10 h-10 flex items-center justify-center text-2xl"
//                   onClick={() => removeField(index)}
//                 >
//                   -
//                 </button>
//               )}
//             </div>
//             <input
//               type="text"
//               placeholder="Description"
//               value={f.description}
//               onChange={(e) => handleDescriptionChange(index, e)}
//               className="mt-3 border p-2 rounded w-full"
//             />
//           </div>
//         ))}
//         <p className="text-sm text-gray-500 mb-3">
//           Note - (Upload only image, excel, msword, pdf)
//         </p>
//         <button type="submit" className="btn btn-primary" disabled={loading}>
//           {loading ? "Uploading..." : "Upload"}
//         </button>
//       </form>
//       </div>

//   );
// }






import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { uploadTrainingDocs, getTrainingDocs, deleteTrainingDoc } from "../services/authService";

export default function ManageTrainingDocs() {
  const { clientId } = useParams(); // ✅ take from URL param
  const [files, setFiles] = useState([{ file: null, description: "" }]);
  const [trainingDocs, setTrainingDocs] = useState([]);
  const [loading, setLoading] = useState(false);

  // ------------------ Fetch Training Docs ------------------
  const fetchTrainingDocs = async () => {
    if (!clientId) return;
    try {
      const docs = await getTrainingDocs(clientId);
      const mappedDocs = docs.map((doc) => ({
        ...doc,
        createdatetimestamp: doc.createdate,
      }));
      setTrainingDocs(mappedDocs);
    } catch (err) {
      console.error("Error fetching training docs:", err);
    }
  };

  useEffect(() => {
    fetchTrainingDocs();
  }, [clientId]);

  // ------------------ File Handlers ------------------
  const handleFileChange = (index, e) => {
    const newFiles = [...files];
    newFiles[index].file = e.target.files[0];
    setFiles(newFiles);
  };

  const handleDescriptionChange = (index, e) => {
    const newFiles = [...files];
    newFiles[index].description = e.target.value;
    setFiles(newFiles);
  };

  const addField = () => {
    if (files.length >= 10) return;
    setFiles([...files, { file: null, description: "" }]);
  };

  const removeField = (index) => {
    const newFiles = files.filter((_, i) => i !== index);
    setFiles(newFiles);
  };

  // ------------------ Upload Handler ------------------
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!clientId) {
      alert("❌ Client ID is missing in URL");
      return;
    }
    if (!files.some((f) => f.file)) {
      alert("Please select at least one file to upload");
      return;
    }

    const selectedFiles = files.map((f) => f.file);
    const descriptions = files.map((f) => f.description);

    setLoading(true);
    try {
      await uploadTrainingDocs(clientId, selectedFiles, descriptions);
      // console.log("Client ID:", clientId);
      alert("✅ Upload successful!");
      setFiles([{ file: null, description: "" }]);
      fetchTrainingDocs(); // Refresh list
    } catch (err) {
      console.error("Upload error:", err);
      alert(err || "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  // ------------------ Delete Handler ------------------
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this training doc?")) return;
    try {
      await deleteTrainingDoc(id);
      alert("Deleted successfully!");
      fetchTrainingDocs(); // Refresh list
    } catch (err) {
      console.error("Delete error:", err);
      alert(err || "Delete failed");
    }
  };

  return (
    <div className="p-4 border rounded-lg bg-white shadow-md">
      <h5 className="mb-5">Manage Training Docs </h5>

      {/* Upload Form */}
      <form onSubmit={handleSubmit}>
        {files.map((f, index) => (
          <div key={index} className="mb-4">
            <div className="flex items-center gap-2">
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.gif,.xlsx,.xls,.doc,.docx,.pdf"
                onChange={(e) => handleFileChange(index, e)}
                className="border p-1 rounded w-full"
              />
              {index === 0 ? (
                <button
                  type="button"
                  className="btn btn-success w-10 h-10 flex items-center justify-center text-2xl"
                  onClick={addField}
                >
                  +
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-danger w-10 h-10 flex items-center justify-center text-2xl"
                  onClick={() => removeField(index)}
                >
                  -
                </button>
              )}
            </div>
            <input
              type="text"
              placeholder="Description"
              value={f.description}
              onChange={(e) => handleDescriptionChange(index, e)}
              className="mt-3 border p-2 rounded w-full"
            />
          </div>
        ))}
        <p className="text-sm text-gray-500 mb-3">
          Note - (Upload only image, excel, msword, pdf)
        </p>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? "Uploading..." : "Upload"}
        </button>
      </form>

      {/* Training Docs List */}
      {/* {trainingDocs.length > 0 && (
        <div className="mt-6">
          <h6>Uploaded Training Docs</h6>
          <ul className="list-disc pl-5">
            {trainingDocs.map((doc) => (
              <li key={doc.id} className="flex justify-between items-center mb-2">
                <span>
                  {doc.Field1 || "Document"} - {doc.Des1} (Uploaded:{" "}
                  {doc.createdatetimestamp})
                </span>
                <button
                  onClick={() => handleDelete(doc.id)}
                  className="btn btn-danger btn-sm"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        </div>
      )} */}
    </div>
  );
}


