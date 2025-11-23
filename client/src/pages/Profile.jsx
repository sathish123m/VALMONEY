import React, { useState, useRef } from 'react';
import { User, Mail, Phone, Lock, Save, Camera, Check } from 'lucide-react';

const Profile = () => {
    const fileInputRef = useRef(null);
    const [avatar, setAvatar] = useState(null);
    const [is2FA, setIs2FA] = useState(true);
    const [msg, setMsg] = useState('');

    const handleAvatarClick = () => fileInputRef.current.click();
    
    const handleFileChange = (e) => {
        if(e.target.files && e.target.files[0]) {
            setAvatar(URL.createObjectURL(e.target.files[0]));
        }
    };

    const handleSave = () => {
        setMsg('Profile Updated Successfully');
        setTimeout(() => setMsg(''), 3000);
    };

    return (
        <div className="max-w-4xl animate-enter">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-txt-primary">Identity Management</h1>
                <p className="text-txt-secondary">Manage your personal information and security settings.</p>
            </header>

            {msg && (
                <div className="mb-6 p-4 bg-green-500/10 text-green-600 border border-green-500/20 rounded-xl flex items-center gap-2">
                    <Check size={20} /> {msg}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="col-span-1">
                    <div className="card-base p-6 text-center">
                        <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-brand to-purple-500 mx-auto mb-4 p-1 cursor-pointer group relative" onClick={handleAvatarClick}>
                            <div className="w-full h-full rounded-full bg-bg-card flex items-center justify-center overflow-hidden">
                                {avatar ? (
                                    <img src={avatar} alt="User" className="w-full h-full object-cover" />
                                ) : (
                                    <User size={60} className="text-txt-secondary group-hover:text-brand transition-colors" />
                                )}
                            </div>
                            <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Camera className="text-white" />
                            </div>
                        </div>
                        <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
                        <h2 className="text-xl font-bold text-txt-primary">User</h2>
                        <p className="text-txt-secondary text-sm mb-4">admin@godmode.com</p>
                        <button onClick={handleAvatarClick} className="text-sm text-brand font-medium hover:underline">Change Avatar</button>
                    </div>
                </div>

                <div className="col-span-2 space-y-6">
                    <div className="card-base p-8">
                        <h3 className="text-lg font-bold text-txt-primary mb-6">Personal Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-bold text-txt-secondary uppercase mb-2">Full Name</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-3 text-txt-secondary" size={18} />
                                    <input type="text" defaultValue="Admin User" className="w-full bg-bg-secondary border border-border rounded-lg py-2.5 pl-10 text-txt-primary outline-none focus:border-brand" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-txt-secondary uppercase mb-2">Phone</label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-3 text-txt-secondary" size={18} />
                                    <input type="text" defaultValue="+1 555 000 0000" className="w-full bg-bg-secondary border border-border rounded-lg py-2.5 pl-10 text-txt-primary outline-none focus:border-brand" />
                                </div>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-txt-secondary uppercase mb-2">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-3 text-txt-secondary" size={18} />
                                    <input type="email" defaultValue="admin@godmode.com" disabled className="w-full bg-bg-secondary/50 border border-border rounded-lg py-2.5 pl-10 text-txt-secondary cursor-not-allowed" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="card-base p-8">
                         <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-txt-primary">Security</h3>
                            <button className="text-sm text-brand font-bold hover:underline">Update Password</button>
                        </div>
                         <div className="flex items-center justify-between p-4 bg-bg-secondary rounded-lg border border-border">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-green-500/10 text-green-500 rounded"><Lock size={20}/></div>
                                <div>
                                    <p className="font-bold text-txt-primary text-sm">Two-Factor Authentication</p>
                                    <p className="text-xs text-txt-secondary">{is2FA ? 'Enabled' : 'Disabled'} via Email</p>
                                </div>
                            </div>
                            <div 
                                className={`relative w-12 h-6 rounded-full cursor-pointer transition-colors ${is2FA ? 'bg-brand' : 'bg-gray-400'}`}
                                onClick={() => setIs2FA(!is2FA)}
                            >
                                <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${is2FA ? 'translate-x-6' : 'translate-x-0'}`}></div>
                            </div>
                         </div>
                    </div>

                    <div className="flex justify-end gap-4">
                        <button className="px-6 py-3 rounded-lg text-txt-secondary hover:bg-bg-secondary transition-all font-medium">Cancel</button>
                        <button onClick={handleSave} className="px-6 py-3 rounded-lg bg-brand text-white font-bold shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 transition-all flex items-center gap-2">
                            <Save size={18} /> Save Changes
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
export default Profile;