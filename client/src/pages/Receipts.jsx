import React, { useState, useEffect } from 'react';
import { UploadCloud, ScanLine, Camera, X, CheckCircle } from 'lucide-react';

const Receipts = () => {
    const [dragActive, setDragActive] = useState(false);
    const [files, setFiles] = useState([]);

    // Simulate AI Processing
    useEffect(() => {
        const interval = setInterval(() => {
            setFiles(prevFiles => prevFiles.map(f => {
                if (f.status === 'scanning') return { ...f, status: 'complete' };
                return f;
            }));
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    const handleFile = (file) => {
        const newFile = {
            id: Date.now(),
            name: file.name,
            status: 'scanning' // scanning -> complete
        };
        setFiles(prev => [...prev, newFile]);
    };

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
        else if (e.type === "dragleave") setDragActive(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
    };

    const handleChange = (e) => {
        if (e.target.files && e.target.files[0]) handleFile(e.target.files[0]);
    };

    return (
        <div className="animate-enter">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-txt-primary">Receipt Vault</h1>
                <p className="text-txt-secondary">Digitize your paper trail. AI Processing active.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div 
                    className={`card-base p-10 flex flex-col items-center justify-center border-2 border-dashed transition-all cursor-pointer relative ${dragActive ? 'border-brand bg-brand/5' : 'border-border'}`}
                    onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
                >
                    <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleChange} />
                    <div className="w-16 h-16 rounded-full bg-bg-secondary flex items-center justify-center mb-4 text-brand">
                        <UploadCloud size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-txt-primary mb-2">Drag & Drop or Click</h3>
                    <p className="text-txt-secondary text-center max-w-sm">
                        Upload PNG, JPG or PDF. We will scan the Merchant, Date, and Amount automatically.
                    </p>
                </div>

                <div className="card-base p-6">
                    <h3 className="font-bold text-txt-primary mb-4 flex items-center gap-2">
                        <ScanLine className="text-brand" size={20} /> Processing Queue
                    </h3>
                    
                    {files.length === 0 ? (
                        <div className="text-center py-10 text-txt-secondary">
                            <Camera size={40} className="mx-auto mb-4 opacity-50" />
                            <p>No receipts in queue.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {files.map((f) => (
                                <div key={f.id} className="flex items-center justify-between p-3 bg-bg-secondary rounded-lg border border-border">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded bg-white flex items-center justify-center border border-border overflow-hidden">
                                            <img src="https://via.placeholder.com/40" alt="receipt" className="opacity-50" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-sm text-txt-primary truncate max-w-[150px]">{f.name}</p>
                                            <p className={`text-xs flex items-center gap-1 ${f.status === 'scanning' ? 'text-brand animate-pulse' : 'text-green-600'}`}>
                                                {f.status === 'scanning' ? 'Scanning...' : <><CheckCircle size={12}/> Verified</>}
                                            </p>
                                        </div>
                                    </div>
                                    <button className="text-txt-secondary hover:text-red-500" onClick={() => setFiles(files.filter(x => x.id !== f.id))}><X size={18}/></button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
export default Receipts;