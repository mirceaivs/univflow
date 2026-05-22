import React, { useState, useEffect } from 'react';
import { ArrowLeft, Settings, Trash2, AlertTriangle, Save, User, Camera, Edit2, Mail, KeyRound, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { Card, Button, Input, Badge, Dialog } from '../components/ui.jsx';
import { useNotification } from '../components/context/NotificationContext.jsx';
import { useUserProfile } from '../hooks/useUserProfile.js';
import { apiClient } from '../services/apiClient.js';
import { useAuthContext } from '../components/context/AuthContext.jsx';

export const SettingsView = ({ setView }) => {
  const { showNotification } = useNotification();
  const { firstName, lastName, email, profilePic, updateName, updateEmail, updateProfilePic } = useUserProfile();
  const { logout } = useAuthContext();

  
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);

  
  const [tempFirstName, setTempFirstName] = useState(firstName || '');
  const [tempLastName, setTempLastName] = useState(lastName || '');
  const [tempEmail, setTempEmail] = useState(email || '');

  useEffect(() => {
    if (!isEditingName) {
      setTempFirstName(firstName || '');
      setTempLastName(lastName || '');
    }
    if (!isEditingEmail) {
      setTempEmail(email || '');
    }
  }, [firstName, lastName, email, isEditingName, isEditingEmail]);
  
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);

  
  const [isDeleteCoursesModalOpen, setIsDeleteCoursesModalOpen] = useState(false);
  const [isDeleteAccountModalOpen, setIsDeleteAccountModalOpen] = useState(false);

  
  const [emailConfirmationSent, setEmailConfirmationSent] = useState(false);

  const handleSaveName = async () => {
    try {
      await updateName({ firstName: tempFirstName, lastName: tempLastName });
      showNotification({ type: 'success', message: 'Numele a fost actualizat cu succes!' });
      setIsEditingName(false);
    } catch (e) {
      showNotification({ type: 'error', message: 'Eroare la actualizarea numelui.' });
    }
  };

  const handleSaveEmail = async () => {
    setEmailConfirmationSent(true);
    try {
      await updateEmail(tempEmail);
      showNotification({ type: 'success', message: 'Vă rugăm să vă verificați noul email!' });
    } catch (e) {
      setEmailConfirmationSent(false);
      
    }
  };

  const handleSavePassword = async () => {
    if (newPassword !== confirmPassword) {
      showNotification({
        type: 'error',
        message: 'Parolele nu coincid!',
      });
      return;
    }
    try {
      await apiClient.put('/users/me/password', {
        oldPassword: currentPassword,
        newPassword: newPassword
      });
      showNotification({
        type: 'success',
        message: 'Parola a fost schimbată cu succes! Vă rugăm să vă logați din nou.',
      });
      setIsEditingPassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => logout(), 2000);
    } catch (e) {
      
    }
  };

  const handleDeleteCourses = () => {
    setIsDeleteCoursesModalOpen(true);
  };

  const confirmDeleteCourses = async () => {
    try {
      await apiClient.delete('/courses');
      showNotification({ type: 'success', message: 'Toate cursurile au fost șterse cu succes.' });
      setIsDeleteCoursesModalOpen(false);
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (e) {
      showNotification({ type: 'error', message: 'Eroare la ștergerea cursurilor.' });
      setIsDeleteCoursesModalOpen(false);
    }
  };

  const handleDeleteAccount = () => {
    setIsDeleteAccountModalOpen(true);
  };

  const confirmDeleteAccount = async () => {
    try {
      await apiClient.delete('/users/me');
      showNotification({ type: 'success', message: 'Contul a fost șters cu succes.' });
      setIsDeleteAccountModalOpen(false);
      setTimeout(() => logout(), 1500);
    } catch (e) {
      setIsDeleteAccountModalOpen(false);
    }
  };

  const handleProfilePicChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          await updateProfilePic(event.target.result);
          showNotification({ type: 'success', message: 'Poza de profil a fost actualizată!' });
        } catch (error) {
          showNotification({ type: 'error', message: 'Eroare la actualizarea pozei de profil.' });
        }
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  return (
    <div className="flex-1 h-screen overflow-y-auto bg-slate-50 dark:bg-slate-950 transition-colors duration-200 flex flex-col">
      
      <div className="flex-1 flex flex-col items-center py-12 px-4 sm:px-8">
        <div className="w-full max-w-3xl">
          
          {}
          <div className="mb-10 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-center gap-4 mb-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 shadow-sm shrink-0">
                <Settings className="w-8 h-8" />
              </div>
              <h1 className="text-4xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight text-left m-0">
                Setări Cont
              </h1>
            </div>
            <p className="text-lg text-slate-500 dark:text-slate-400">
              Gestionează informațiile personale și preferințele contului tău.
            </p>
          </div>

          <div className="relative animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150 fill-mode-both">
            
            <button 
              onClick={() => setView('dashboard')} 
              className="flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors mb-6"
            >
              <ArrowLeft className="w-4 h-4" /> Înapoi la panou
            </button>

            {}
            <Card className="p-6 sm:p-8 shadow-sm border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 mb-6">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                <div 
                  className="relative group cursor-pointer shrink-0" 
                  onClick={() => document.getElementById('profile-pic-upload')?.click()}
                >
                  <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-slate-50 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 flex items-center justify-center shadow-sm transition-all group-hover:shadow-md">
                    {profilePic ? (
                      <img src={profilePic} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-10 h-10 text-slate-400 dark:text-slate-500" />
                    )}
                  </div>
                  <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Camera className="w-6 h-6 text-white" />
                  </div>
                  <input 
                    type="file" 
                    id="profile-pic-upload" 
                    className="hidden" 
                    accept="image/png, image/jpeg, image/jpg" 
                    onChange={handleProfilePicChange} 
                  />
                </div>
                <div className="text-center sm:text-left flex-1">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">Poza de profil</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Recomandat: imagine pătrată, format JPG sau PNG, max 2MB.</p>
                  <Button variant="outline" size="sm" onClick={() => document.getElementById('profile-pic-upload')?.click()}>
                    Schimbă poza
                  </Button>
                </div>
              </div>
            </Card>

            {}
            <Card className="p-6 sm:p-8 shadow-sm border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 mb-6">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-lg">
                    <User className="w-5 h-5" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Informații Personale</h2>
                </div>
                {!isEditingName && (
                  <Button variant="ghost" size="sm" onClick={() => setIsEditingName(true)} className="gap-2">
                    <Edit2 className="w-4 h-4" /> Editează
                  </Button>
                )}
              </div>
              
              {isEditingName ? (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Nume (Nume de familie)</label>
                      <Input 
                        value={tempLastName}
                        onChange={(e) => setTempLastName(e.target.value)}
                        placeholder="Ex: Popescu" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Prenume</label>
                      <Input 
                        value={tempFirstName}
                        onChange={(e) => setTempFirstName(e.target.value)}
                        placeholder="Ex: Alexandru" 
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <Button variant="ghost" onClick={() => { setIsEditingName(false); setTempFirstName(firstName); setTempLastName(lastName); }}>Anulare</Button>
                    <Button onClick={handleSaveName} className="gap-2"><Save className="w-4 h-4"/> Salvează</Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-300">
                  <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Nume (Nume de familie)</p>
                    <p className="text-base font-semibold text-slate-900 dark:text-slate-100">{lastName}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Prenume</p>
                    <p className="text-base font-semibold text-slate-900 dark:text-slate-100">{firstName}</p>
                  </div>
                </div>
              )}
            </Card>

            {}
            <Card className="p-6 sm:p-8 shadow-sm border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 mb-6">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                    <Mail className="w-5 h-5" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Adresă de Email</h2>
                </div>
                {!isEditingEmail && !emailConfirmationSent && (
                  <Button variant="ghost" size="sm" onClick={() => setIsEditingEmail(true)} className="gap-2">
                    <Edit2 className="w-4 h-4" /> Schimbă
                  </Button>
                )}
              </div>
              
              {emailConfirmationSent ? (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6 text-center animate-in zoom-in-95 duration-300">
                  <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-3" />
                  <h3 className="text-lg font-bold text-green-800 dark:text-green-400 mb-2">Verifică-ți noul email</h3>
                  <p className="text-sm text-green-700 dark:text-green-300 mb-4">
                    Am trimis un link de confirmare către <strong>{tempEmail}</strong>. Te rugăm să dai click pe link pentru a finaliza schimbarea adresei de email. Până atunci, vei folosi adresa veche.
                  </p>
                  <div className="flex justify-center gap-3">
                    <Button variant="outline" onClick={() => setEmailConfirmationSent(false)}>Anulează schimbarea</Button>
                    <Button onClick={() => showNotification({ type: 'success', message: 'Email retrimis!' })}>Retrimite emailul</Button>
                  </div>
                </div>
              ) : isEditingEmail ? (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Noua adresă de email</label>
                    <Input 
                      type="email"
                      value={tempEmail}
                      onChange={(e) => setTempEmail(e.target.value)}
                      placeholder="student@universitate.ro" 
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400">Vei fi deconectat după confirmarea noii adrese.</p>
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <Button variant="ghost" onClick={() => { setIsEditingEmail(false); setTempEmail(email); }}>Anulare</Button>
                    <Button onClick={handleSaveEmail} className="gap-2"><Mail className="w-4 h-4"/> Trimite confirmare</Button>
                  </div>
                </div>
              ) : (
                <div className="animate-in fade-in duration-300">
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Email curent</p>
                  <div className="flex items-center gap-3">
                    <p className="text-base font-semibold text-slate-900 dark:text-slate-100">{email}</p>
                    <Badge variant="success" className="text-[10px]">Verificat</Badge>
                  </div>
                </div>
              )}
            </Card>

            {}
            <Card className="p-6 sm:p-8 shadow-sm border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 mb-8">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Securitate</h2>
                </div>
                {!isEditingPassword && (
                  <Button variant="ghost" size="sm" onClick={() => setIsEditingPassword(true)} className="gap-2">
                    <Edit2 className="w-4 h-4" /> Schimbă Parola
                  </Button>
                )}
              </div>
              
              {isEditingPassword ? (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <div className="space-y-2 max-w-md relative">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Parola actuală</label>
                    <div className="relative">
                      <Input 
                        type={showPasswords ? "text" : "password"}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="••••••••" 
                        className="pr-10"
                      />
                      <button type="button" onClick={() => setShowPasswords(!showPasswords)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                        {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div className="space-y-2 relative">
                      <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Parolă nouă</label>
                      <div className="relative">
                        <Input 
                          type={showPasswords ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="••••••••" 
                          className="pr-10"
                        />
                        <button type="button" onClick={() => setShowPasswords(!showPasswords)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                          {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2 relative">
                      <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Confirmare parolă nouă</label>
                      <div className="relative">
                        <Input 
                          type={showPasswords ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="••••••••" 
                          className="pr-10"
                        />
                        <button type="button" onClick={() => setShowPasswords(!showPasswords)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                          {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <Button variant="ghost" onClick={() => { setIsEditingPassword(false); setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); }}>Anulare</Button>
                    <Button onClick={handleSavePassword} className="gap-2"><Save className="w-4 h-4"/> Actualizează Parola</Button>
                  </div>
                </div>
              ) : (
                <div className="animate-in fade-in duration-300">
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Parolă</p>
                  <p className="text-base font-semibold text-slate-900 dark:text-slate-100">••••••••</p>
                </div>
              )}
            </Card>

            {}
            <Card className="p-6 sm:p-8 shadow-sm border-red-200 dark:border-red-900/30 bg-red-50/50 dark:bg-red-950/10">
              <h2 className="text-xl font-bold text-red-600 dark:text-red-400 mb-6 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5"/> Zona de Pericol
              </h2>
              
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-5 bg-white dark:bg-slate-900 rounded-xl border border-red-100 dark:border-red-900/20 shadow-sm">
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-slate-100">Șterge toate cursurile</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Această acțiune este ireversibilă și va șterge toate materialele și testele tale.</p>
                  </div>
                  <Button variant="danger" onClick={handleDeleteCourses} className="shrink-0 gap-2 w-full sm:w-auto">
                    <Trash2 className="w-4 h-4"/> Șterge Cursurile
                  </Button>
                </div>
                
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-5 bg-white dark:bg-slate-900 rounded-xl border border-red-100 dark:border-red-900/20 shadow-sm">
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-slate-100">Șterge contul</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Șterge definitiv contul și toate datele asociate acestuia din sistem.</p>
                  </div>
                  <Button variant="danger" onClick={handleDeleteAccount} className="shrink-0 gap-2 w-full sm:w-auto">
                    <Trash2 className="w-4 h-4"/> Șterge Contul
                  </Button>
                </div>
              </div>
            </Card>

          </div>
        </div>
      </div>

      <Dialog isOpen={isDeleteCoursesModalOpen} onClose={() => setIsDeleteCoursesModalOpen(false)} title="Confirmare ștergere">
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
          Ești sigur că vrei să ștergi TOATE cursurile? Această acțiune este ireversibilă și va duce la pierderea tuturor materialelor și testelor asociate.
        </p>
        <div className="flex justify-end gap-3 mt-6 pt-4 pb-1 border-t border-slate-200 dark:border-slate-800">
          <Button variant="outline" onClick={() => setIsDeleteCoursesModalOpen(false)}>Anulare</Button>
          <Button variant="danger" onClick={confirmDeleteCourses} className="gap-2">
            <Trash2 className="w-4 h-4" /> Șterge Cursurile
          </Button>
        </div>
      </Dialog>

      <Dialog isOpen={isDeleteAccountModalOpen} onClose={() => setIsDeleteAccountModalOpen(false)} title="Confirmare ștergere cont">
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
          Ești sigur că vrei să îți ștergi contul? Toate datele tale, inclusiv progresul, materialele și istoricul testelor, vor fi pierdute definitiv.
        </p>
        <div className="flex justify-end gap-3 mt-6 pt-4 pb-1 border-t border-slate-200 dark:border-slate-800">
          <Button variant="outline" onClick={() => setIsDeleteAccountModalOpen(false)}>Anulare</Button>
          <Button variant="danger" onClick={confirmDeleteAccount} className="gap-2">
            <Trash2 className="w-4 h-4" /> Șterge Contul
          </Button>
        </div>
      </Dialog>
    </div>
  );
};
