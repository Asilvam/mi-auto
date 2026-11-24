import { useState } from 'react'
import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google'
import { CarFront, CircleHelp, Fuel, MapPin, ShieldCheck } from 'lucide-react'
import { useAuth } from './auth'

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined

export default function LoginScreen() {
  const { signInWithGoogle } = useAuth()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  return <div className="login-page">
    <div className="login-brand"><div className="brand-mark"><CarFront size={20}/></div><span>mi auto</span></div>
    <main className="login-card">
      <div className="login-art"><div className="login-sun"/><div className="login-road road-a"/><div className="login-road road-b"/><div className="login-pin"><MapPin size={19} fill="currentColor"/></div><div className="login-car"><CarFront size={47}/></div><div className="login-chip"><Fuel size={14}/> Rutas que rinden</div></div>
      <div className="login-copy">
        <div className="eyebrow"><span className="eyebrow-line"/> TU ESPACIO DE CONDUCCIÓN</div>
        <h1>Todo tu camino,<br/><span>en una sola app.</span></h1>
        <p>Organiza viajes y deliveries, cuenta kilómetros y revisa tus costos con Mi Auto.</p>
        {googleClientId ? <GoogleOAuthProvider clientId={googleClientId}><div className="google-login-button"><GoogleLogin onSuccess={async result=>{if(!result.credential)return;setBusy(true);setError('');try{await signInWithGoogle(result.credential)}catch(e){setError(e instanceof Error?e.message:'No se pudo iniciar sesión.')}finally{setBusy(false)}}} onError={()=>setError('Google no pudo iniciar sesión. Intenta nuevamente.')} text="continue_with" shape="rectangular" theme="outline" size="large" width="330"/></div></GoogleOAuthProvider> : <div className="login-setup"><b>Falta configurar Google Sign-In</b><span>Agrega VITE_GOOGLE_CLIENT_ID al archivo .env.local del frontend y GOOGLE_CLIENT_ID al .env del backend.</span></div>}
        {busy&&<div className="login-status">Validando tu cuenta…</div>}
        {error&&<div className="login-error" role="alert">{error}</div>}
        <div className="privacy-note"><ShieldCheck size={17}/><span>Tu sesión se protege con tokens seguros. Nunca guardamos tu contraseña de Google.</span></div>
      </div>
    </main>
    <div className="login-footer"><span>Diseñado para recorrer Quintero</span><button type="button" onClick={()=>setError('Tu perfil, vehículos y rutas se guardarán asociados a tu cuenta.')}><CircleHelp size={15}/> ¿Cómo funciona?</button></div>
  </div>
}
