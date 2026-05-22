import React, { useMemo, useState } from 'react';
import { landingFeatures } from '../constants/landingFeatures.js';
import { useCarousel } from '../hooks/useCarousel.js';
import { useAuthContext } from '../components/context/AuthContext.jsx';
import { useNotification } from '../components/context/NotificationContext.jsx';
import {
  GraduationCap,
  FileText,
  Cpu,
  FileQuestion,
  ArrowRight,
  Moon,
  Sun,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  Library,
  ChevronLeft,
  ChevronRight,
  Mail,
  Loader2,
  Eye,
  EyeOff
} from 'lucide-react';
import { Button, Card, Input } from '../components/ui.jsx';


export const LandingView = ({ onLogin, isDarkMode, toggleTheme, isAuthLoading }) => {
  const { showNotification } = useNotification();
  const features = landingFeatures;

  const {
    authMode,
    setAuthMode,
    resetSent,
    isRegisterSuccess,
    verificationEmail,
    highlightAuth,
    handleSubmit,
    handleResetPassword,
    backToLogin,
    handleStartNow,
    confirmPasswordReset,
    resendCode,
    isSubmitting,
    resetToken, 
    requestPasswordReset,
  } = useAuthContext();

  const [codeResent, setCodeResent] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resetCodeResent, setResetCodeResent] = useState(false);
  const [isResendingReset, setIsResendingReset] = useState(false);

  const isResetMode = Boolean(resetToken);

  const {
    scrollRef,
    isHovered,
    setIsHovered,
    handleMouseDown,
    handleMouseLeave,
    handleMouseUp,
    handleMouseMove,
    scrollLeftBtn,
    scrollRightBtn,
  } = useCarousel();

  
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [registerFirstName, setRegisterFirstName] = useState('');
  const [registerLastName, setRegisterLastName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerPassword2, setRegisterPassword2] = useState('');

  const [forgotEmail, setForgotEmail] = useState('');

  const [newPassword, setNewPassword] = useState('');
  const [newPassword2, setNewPassword2] = useState('');
  const [resetDone, setResetDone] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const scrollToSection = (e, sectionId) => {
    e?.preventDefault?.();
    const el = document.getElementById(sectionId);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const carouselFeatures = useMemo(() => [...features, ...features], [features]);

  const onLoginSubmit = (e) => {
    handleSubmit(e, { email: loginEmail, password: loginPassword });
  };

  const onRegisterSubmit = (e) => {
    if (registerPassword !== registerPassword2) return;
    handleSubmit(e, {
      firstName: registerFirstName,
      lastName: registerLastName,
      email: registerEmail,
      password: registerPassword,
    });
  };

  const onForgotSubmit = (e) => {
    handleResetPassword(e, forgotEmail);
  };

  const onConfirmResetSubmit = async (e) => {
    e.preventDefault();
    if (!resetToken) return;
    if (!newPassword || newPassword !== newPassword2) return;

    try {
      await confirmPasswordReset({ token: resetToken, newPassword });
      setResetDone(true);
    } catch {
      
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    try {
      await resendCode(verificationEmail || registerEmail);
      setCodeResent(true);
      showNotification({ type: 'success', message: 'Emailul de confirmare a fost retrimis cu succes!' });
      setTimeout(() => {
        setCodeResent(false);
      }, 10000);
    } catch (e) {
      showNotification({ type: 'error', message: 'Eroare la retrimiterea emailului.' });
    } finally {
      setIsResending(false);
    }
  };

  const handleResendReset = async () => {
    setIsResendingReset(true);
    try {
      await requestPasswordReset(forgotEmail);
      setResetCodeResent(true);
      showNotification({ type: 'success', message: 'Emailul de resetare a parolei a fost retrimis cu succes!' });
      setTimeout(() => {
        setResetCodeResent(false);
      }, 10000);
    } catch (e) {
      showNotification({ type: 'error', message: 'Eroare la retrimiterea emailului.' });
    } finally {
      setIsResendingReset(false);
    }
  };

  const handleBackToLogin = () => {
    setCodeResent(false);
    setResetCodeResent(false);
    backToLogin();
  };
  
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 flex flex-col transition-colors duration-200 scroll-smooth">
      {}
      <header className="fixed top-0 left-0 right-0 w-full px-8 py-4 flex justify-between items-center bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 z-50 transition-colors duration-200">
        <div className="flex items-center gap-2 cursor-pointer" onClick={scrollToTop}>
          <GraduationCap className="w-7 h-7 text-primary-600 dark:text-primary-500" />
          <span className="font-bold text-xl text-slate-900 dark:text-slate-100 tracking-tight">UnivFlow</span>
        </div>
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600 dark:text-slate-400">
          <a
            href="#despre"
            onClick={(e) => scrollToSection(e, 'despre')}
            className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors relative after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-0.5 after:bg-primary-600 dark:after:bg-primary-400 hover:after:w-full after:transition-all after:duration-300"
          >
            Despre Noi
          </a>
          <a
            href="#functionalitati"
            onClick={(e) => scrollToSection(e, 'functionalitati')}
            className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors relative after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-0.5 after:bg-primary-600 dark:after:bg-primary-400 hover:after:w-full after:transition-all after:duration-300"
          >
            Funcționalități
          </a>
          <button
            onClick={toggleTheme}
            className="text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
            title={isDarkMode ? 'Comută la modul luminos' : 'Comută la modul întunecat'}
          >
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </nav>
      </header>

      {}
      <main className="flex-1 flex flex-col lg:flex-row items-center justify-center p-8 gap-16 max-w-7xl mx-auto w-full pt-32 pb-20">
        <div className="flex-1 space-y-8 animate-in fade-in slide-in-from-left-8 duration-700">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold tracking-wide uppercase border border-slate-200 dark:border-slate-700 transition-colors">
            <Cpu className="w-4 h-4 text-primary-600 dark:text-primary-400" /> TEHNOLOGIE RAG INTEGRATĂ
          </div>
          <h1 className="text-5xl lg:text-6xl font-extrabold text-slate-900 dark:text-slate-100 leading-[1.1] tracking-tight">
            UnivFlow - Asistentul tău personal de studiu bazat pe AI
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-xl leading-relaxed">
            Transformă PDF-urile de curs în conversații inteligente și teste personalizate folosind tehnologia RAG.
            Organizează-ți materialele academice cu claritate și eficiență.
          </p>

          <div className="flex items-center gap-4 pt-4">
            <Button
              size="lg"
              className="gap-2 text-base px-8 shadow-lg shadow-primary-500/30 hover:-translate-y-1 transition-all duration-300"
              onClick={handleStartNow}
            >
              Începe acum <ArrowRight className="w-5 h-5" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="text-base px-8 hover:-translate-y-1 transition-all duration-300"
              onClick={(e) => scrollToSection(e, 'functionalitati')}
            >
              Află mai multe
            </Button>
          </div>

          {}
          <div className="mt-12 flex items-center gap-6 bg-slate-50 dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 max-w-md transition-colors">
            <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 dark:text-slate-500 shadow-sm border border-slate-200 dark:border-slate-700">
              <FileText className="w-8 h-8" />
            </div>
            <div className="flex-1 flex items-center justify-center text-slate-300 dark:text-slate-600">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
            <div className="w-20 h-20 bg-primary-600 dark:bg-primary-500 rounded-full flex items-center justify-center text-white shadow-xl shadow-primary-200/50 dark:shadow-primary-900/20 z-10 animate-pulse">
              <Cpu className="w-10 h-10" />
            </div>
            <div className="flex-1 flex items-center justify-center text-slate-300 dark:text-slate-600">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
            <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 dark:text-slate-500 shadow-sm border border-slate-200 dark:border-slate-700">
              <FileQuestion className="w-8 h-8" />
            </div>
          </div>
        </div>

        {}
        <div id="auth-section" className="w-full max-w-md animate-in fade-in slide-in-from-right-8 duration-700">
          <Card
            className={`p-8 shadow-2xl shadow-slate-200/50 dark:shadow-none border-slate-200/60 dark:border-slate-800 rounded-2xl transition-all duration-500 relative overflow-hidden min-h-[480px] ${
              highlightAuth
                ? 'ring-4 ring-primary-500 border-primary-500 shadow-[0_0_40px_rgba(37,99,235,0.4)] dark:shadow-[0_0_40px_rgba(37,99,235,0.6)] scale-[1.02] -translate-y-2'
                : ''
            }`}
          >
            {}
            <div
              className={`absolute inset-0 p-8 bg-white dark:bg-slate-900 transition-all duration-500 ease-in-out ${
                authMode === 'forgot-password' && !isResetMode ? 'translate-y-0 opacity-100 z-20' : 'translate-y-full opacity-0 z-0 pointer-events-none'
              }`}
            >
              <button
                onClick={backToLogin}
                className="flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 mb-8 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Înapoi la autentificare
              </button>

              {!resetSent ? (
                <div className="animate-in fade-in duration-500">
                  <div className="text-center mb-8">
                    <div className="w-12 h-12 bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Resetare Parolă</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Introdu adresa de email și îți vom trimite un link pentru resetare.</p>
                  </div>

                  <form className="space-y-5" onSubmit={onForgotSubmit}>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Adresă de Email</label>
                      <Input type="email" placeholder="student@universitate.ro" required value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} />
                    </div>
                    <Button type="submit" className="w-full mt-4 shadow-md hover:shadow-lg transition-all" size="lg" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" /> Se trimite...
                        </>
                      ) : (
                        'Trimite link resetare'
                      )}
                    </Button>
                  </form>
                </div>
              ) : (
                <div className="animate-in zoom-in-95 fade-in duration-500 text-center mt-10">
                  <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3">Verifică-ți emailul</h2>
                  <p className="text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
                    Am trimis un link de resetare a parolei pe adresa ta de email. Te rugăm să verifici și folderul Spam.
                  </p>

                  {resetCodeResent && (
                    <div className="mb-6 p-3 bg-green-50/80 dark:bg-green-950/20 border border-green-200/60 dark:border-green-800/40 text-green-700 dark:text-green-400 rounded-xl text-sm font-medium animate-in fade-in duration-300">
                      Emailul de resetare a parolei a fost retrimis cu succes!
                    </div>
                  )}

                  <div className="space-y-3">
                    <Button onClick={handleResendReset} className="w-full shadow-md hover:shadow-lg transition-all" size="lg" disabled={isResendingReset}>
                      {isResendingReset ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Se trimite...
                        </>
                      ) : (
                        'Retrimite emailul'
                      )}
                    </Button>
                    <Button variant="ghost" onClick={handleBackToLogin} className="w-full transition-all" size="lg">
                      Înapoi la Autentificare
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {}
            <div
              className={`absolute inset-0 p-8 bg-white dark:bg-slate-900 transition-all duration-500 ease-in-out ${
                isRegisterSuccess ? 'translate-x-0 opacity-100 z-30' : 'translate-x-full opacity-0 z-0 pointer-events-none'
              }`}
            >
              <div className="animate-in zoom-in-95 fade-in duration-500 text-center mt-10">
                <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                  <Mail className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3">Confirmă adresa de email</h2>
                <p className="text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
                  Am trimis un link de confirmare pe adresa ta de email. Te rugăm să dai click pe link pentru a-ți activa contul.
                </p>

                {codeResent && (
                  <div className="mb-6 p-3 bg-green-50/80 dark:bg-green-950/20 border border-green-200/60 dark:border-green-800/40 text-green-700 dark:text-green-400 rounded-xl text-sm font-medium animate-in fade-in duration-300">
                    Emailul de confirmare a fost retrimis cu succes!
                  </div>
                )}

                <div className="space-y-3">
                  <Button onClick={handleResend} className="w-full shadow-md hover:shadow-lg transition-all" size="lg" disabled={isResending}>
                    {isResending ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Se trimite...
                      </>
                    ) : (
                      'Retrimite emailul'
                    )}
                  </Button>
                  <Button variant="ghost" onClick={handleBackToLogin} className="w-full transition-all" size="lg">
                    Înapoi la Autentificare
                  </Button>
                </div>
              </div>
            </div>

            {}
            <div className={`transition-all duration-500 ease-in-out ${(authMode !== 'forgot-password' || isResetMode) && !isRegisterSuccess ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
              {isResetMode ? (
                <>
                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Setează o parolă nouă</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                      Introdu noua parolă pentru contul tău.
                    </p>
                  </div>

                  {resetDone ? (
                    <div className="animate-in zoom-in-95 fade-in duration-500 text-center mt-10">
                      <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                        <CheckCircle2 className="w-8 h-8" />
                      </div>
                      <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3">Parola a fost resetată</h2>
                      <p className="text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
                        Poți reveni acum la autentificare.
                      </p>
                      <Button variant="ghost" onClick={() => window.location.assign(window.location.pathname)} className="w-full transition-all" size="lg">
                        Înapoi la Autentificare
                      </Button>
                    </div>
                  ) : (
                    <form onSubmit={onConfirmResetSubmit} className="flex flex-col">
                      <div className="space-y-2 mb-5 relative">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Parolă nouă</label>
                        <div className="relative">
                          <Input type={showPassword ? "text" : "password"} placeholder="••••••••" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="pr-10" />
                          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2 mb-6 relative">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Confirmare parolă nouă</label>
                        <div className="relative">
                          <Input type={showPassword ? "text" : "password"} placeholder="••••••••" required value={newPassword2} onChange={(e) => setNewPassword2(e.target.value)} className="pr-10" />
                          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <Button type="submit" className="w-full shadow-md hover:shadow-lg transition-all text-base h-12 mt-auto" size="lg" disabled={isSubmitting || !resetToken}>
                        {isSubmitting ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" /> Se salvează...
                          </>
                        ) : (
                          'Schimbă parola'
                        )}
                      </Button>
                    </form>
                  )}
                </>
              ) : (
                <>
                  <div className="flex gap-4 border-b border-slate-200 dark:border-slate-800 mb-8">
                    <button
                      type="button"
                      onClick={() => setAuthMode('login')}
                      className={`pb-4 text-base font-bold flex-1 transition-colors ${
                        authMode === 'login'
                          ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-600 dark:border-primary-400'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                      }`}
                    >
                      Autentificare
                    </button>
                    <button
                      type="button"
                      onClick={() => setAuthMode('register')}
                      className={`pb-4 text-base font-bold flex-1 transition-colors ${
                        authMode === 'register'
                          ? 'text-primary-600 dark:text-primary-400 border-b--2 border-primary-600 dark:border-primary-400'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                      }`}
                    >
                      Creare Cont
                    </button>
                  </div>

                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                      {authMode === 'login' ? 'Bine ai revenit' : 'Creează un cont'}
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                      {authMode === 'login' ? 'Continuă-ți sesiunea de studiu inteligent.' : 'Începe să înveți mai eficient chiar acum.'}
                    </p>
                  </div>

                  {authMode === 'login' ? (
                    <form onSubmit={onLoginSubmit} className="flex flex-col">
                      <div className="space-y-2 mb-5">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Adresă de Email</label>
                        <Input type="email" placeholder="student@universitate.ro" required value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} />
                      </div>

                      <div className="space-y-2 mb-6 relative">
                        <div className="flex justify-between items-center">
                          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Parolă</label>
                          <button
                            type="button"
                            onClick={() => setAuthMode('forgot-password')}
                            className="text-xs text-primary-600 dark:text-primary-400 hover:underline font-medium transition-colors"
                          >
                            Ai uitat parola?
                          </button>
                        </div>
                        <div className="relative">
                          <Input type={showPassword ? "text" : "password"} placeholder="••••••••" required value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} className="pr-10" />
                          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <Button type="submit" className="w-full shadow-md hover:shadow-lg transition-all text-base h-12 mt-auto" size="lg" disabled={isSubmitting || isAuthLoading}>
                        {isSubmitting || isAuthLoading ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" /> Se autentifică...
                          </>
                        ) : (
                          'Intră în cont'
                        )}
                      </Button>
                    </form>
                  ) : (
                    <form onSubmit={onRegisterSubmit} className="flex flex-col">
                      <div className="grid grid-cols-2 gap-4 mb-5">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Nume</label>
                          <Input type="text" placeholder="Ex: Popescu" required value={registerLastName} onChange={(e) => setRegisterLastName(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Prenume</label>
                          <Input type="text" placeholder="Ex: Alexandru" required value={registerFirstName} onChange={(e) => setRegisterFirstName(e.target.value)} />
                        </div>
                      </div>

                      <div className="space-y-2 mb-5">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Adresă de Email</label>
                        <Input type="email" placeholder="student@universitate.ro" required value={registerEmail} onChange={(e) => setRegisterEmail(e.target.value)} />
                      </div>

                      <div className="space-y-2 mb-5 relative">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Parolă</label>
                        <div className="relative">
                          <Input type={showPassword ? "text" : "password"} placeholder="••••••••" required value={registerPassword} onChange={(e) => setRegisterPassword(e.target.value)} className="pr-10" />
                          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2 mb-6 relative">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Confirmare Parolă</label>
                        <div className="relative">
                          <Input type={showPassword ? "text" : "password"} placeholder="••••••••" required value={registerPassword2} onChange={(e) => setRegisterPassword2(e.target.value)} className="pr-10" />
                          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <Button type="submit" className="w-full shadow-md hover:shadow-lg transition-all text-base h-12 mt-auto" size="lg" disabled={isSubmitting}>
                        {isSubmitting ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" /> Se creează...
                          </>
                        ) : (
                          'Creează contul'
                        )}
                      </Button>
                    </form>
                  )}
                </>
              )}
            </div>
          </Card>
        </div>
      </main>

      {}
      <section id="functionalitati" className="bg-slate-50 dark:bg-slate-900/50 py-32 border-t border-slate-100 dark:border-slate-800 transition-colors duration-200 overflow-hidden">
        <div className="max-w-7xl mx-auto px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl font-extrabold text-slate-900 dark:text-slate-100 mb-6 tracking-tight">Funcționalități Principale</h2>
            <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto text-lg leading-relaxed">
              Accelerează procesul de învățare cu AI. Tehnologie avansată pentru un proces optimizat și personalizat nevoilor tale academice.
            </p>
          </div>

          {}
          <div className="relative group" onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
            {}
            <button
              onClick={scrollLeftBtn}
              className="absolute left-0 top-1/2 -translate-y-1/2 -ml-6 z-10 bg-white dark:bg-slate-800 p-4 rounded-full shadow-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-primary-600 dark:hover:text-primary-400 hover:scale-110 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 hidden md:block"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            <div
              ref={scrollRef}
              className="flex overflow-x-auto snap-x snap-mandatory gap-8 pb-16 px-4 scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
              onMouseDown={handleMouseDown}
              onMouseLeave={handleMouseLeave}
              onMouseUp={handleMouseUp}
              onMouseMove={handleMouseMove}
            >
              {carouselFeatures.map((feat, idx) => {
                const Icon = feat.icon;
                return (
                  <Card
                    key={idx}
                    className="snap-center shrink-0 w-[320px] md:w-[480px] p-12 border border-slate-200/60 dark:border-slate-800/60 shadow-xl hover:shadow-2xl hover:shadow-primary-500/10 dark:hover:shadow-primary-900/20 bg-white dark:bg-slate-900 transition-all duration-500 hover:-translate-y-2 rounded-[2.5rem] group/card relative overflow-hidden"
                  >
                    <div className="w-20 h-20 bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-3xl flex items-center justify-center mb-8 group-hover/card:scale-110 group-hover/card:rotate-3 group-hover/card:bg-primary-600 group-hover/card:text-white dark:group-hover/card:bg-primary-500 transition-all duration-500">
                      <Icon className="w-10 h-10" />
                    </div>
                    <h3 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 mb-5 tracking-tight">{feat.title}</h3>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-lg">{feat.desc}</p>
                  </Card>
                );
              })}
            </div>

            {}
            <button
              onClick={scrollRightBtn}
              className="absolute right-0 top-1/2 -translate-y-1/2 -mr-6 z-10 bg-white dark:bg-slate-800 p-4 rounded-full shadow-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-primary-600 dark:hover:text-primary-400 hover:scale-110 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 hidden md:block"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        </div>
      </section>

      {}
      <section id="despre" className="py-24 bg-white dark:bg-slate-950 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row items-center gap-16">
          <div className="flex-1 space-y-6">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Despre Noi</h2>
            <blockquote className="text-lg text-slate-600 dark:text-slate-400 italic border-l-4 border-primary-500 pl-4 py-1">
              "Misiunea noastră este să transformăm modul în care studenții interacționează cu informația academică."
            </blockquote>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              UnivFlow este un proiect de cercetare academică în domeniul Inteligenței Artificiale, conceput pentru a eficientiza și simplifica procesul de învățare al studenților.
            </p>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Echipa noastră dezvoltă soluții inovatoare folosind modele de limbaj de ultimă generație și arhitecturi Retrieval-Augmented Generation (RAG) pentru a asigura acuratețea și relevanța informațiilor. Ne propunem să oferim un instrument de studiu riguros, transparent și adaptat cerințelor mediului universitar modern.
            </p>
          </div>
          <div className="flex-1 w-full">
            <div className="aspect-video bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-600 transition-colors">
              <svg className="w-24 h-24 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
          </div>
        </div>
      </section>

      {}
      <footer className="bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-8 px-8 transition-colors duration-200">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-bold">
            <GraduationCap className="w-5 h-5 text-primary-600 dark:text-primary-500" /> UnivFlow
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">© 2024 UnivFlow Project. Toate drepturile rezervate.</p>
        </div>
      </footer>
    </div>
  );
};