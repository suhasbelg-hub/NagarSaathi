"use client";

import React, { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  ClipboardCheck,
  Construction,
  FileCheck2,
  FileText,
  HardHat,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Users,
  Wrench
} from "lucide-react";
import type { Role } from "@/lib/types";
import { ROLE_COPY } from "@/lib/mock-data";
import { Button, Field } from "@/components/ui";
import { useDemo } from "@/components/demo-store";

const HOME_FOR_ROLE: Record<Role, string> = {
  citizen: "/dashboard/citizen",
  staff: "/dashboard/staff",
  contractor: "/dashboard/contractor",
  admin: "/admin"
};

const DEMO_ROLES: { role: Role; name: string; detail: string; icon: React.ElementType }[] = [
  { role: "citizen", name: "Priya Sharma", detail: "File and track a civic report", icon: Users },
  { role: "staff", name: "Ramesh Iyer", detail: "Triage and coordinate work", icon: ClipboardCheck },
  { role: "contractor", name: "Suresh Patel", detail: "Review eligible work and bids", icon: HardHat },
  { role: "admin", name: "Meera Krishnan", detail: "Review verification and service health", icon: ShieldCheck }
];

function safeDestination(role: Role) {
  const requested = new URLSearchParams(window.location.search).get("next");
  if (!requested) return HOME_FOR_ROLE[role];
  let destination: URL;
  try { destination = new URL(requested, window.location.origin); } catch { return HOME_FOR_ROLE[role]; }
  if (destination.origin !== window.location.origin) return HOME_FOR_ROLE[role];
  const permittedPrefix = role === "admin" ? "/admin" : `/dashboard/${role}`;
  const permitted = destination.pathname === permittedPrefix || destination.pathname.startsWith(`${permittedPrefix}/`);
  return permitted ? `${destination.pathname}${destination.search}${destination.hash}` : HOME_FOR_ROLE[role];
}

export function PublicPage() {
  const pathname = usePathname();
  if (pathname === "/") return <LandingPage />;
  if (pathname === "/login") return <LoginPage />;
  if (pathname === "/register") return <RegisterPage />;
  if (pathname === "/verify") return <VerifyPage />;
  if (pathname === "/forgot-password") return <ForgotPasswordPage />;
  if (pathname === "/reset-password") return <ResetPasswordPage />;
  if (pathname === "/thank-you") return <ThankYouPage />;
  return <NotFoundPage />;
}

function LandingPage() {
  const router = useRouter();
  const roleCards = [
    { title: "For residents", text: "Report a local issue with a photo and follow each update in one place.", icon: FileText, tone: "mint" },
    { title: "For municipal teams", text: "Prioritise incoming work, keep an eye on deadlines, and coordinate the next step.", icon: ClipboardCheck, tone: "sand" },
    { title: "For contractors", text: "See work that matches your trade and service zones, then share completion proof.", icon: HardHat, tone: "blue" },
    { title: "For administrators", text: "Review contractor credentials and understand the health of civic service delivery.", icon: BadgeCheck, tone: "slate" }
  ];
  return <div className="landing-page">
    <section className="hero-section">
      <div className="hero-copy">
        <span className="hero-kicker"><span className="hero-kicker-dot" />A clearer way to raise civic issues</span>
        <h1>Better neighbourhoods begin with <span>a clear next step.</span></h1>
        <p className="hero-description">NagarSaathi brings residents, municipal teams and verified contractors together around one simple promise: every report stays visible from the first photo to the final fix.</p>
        <div className="hero-actions"><Button size="lg" icon={ArrowRight} onClick={() => router.push("/register")}>Get started</Button><Link href="/login" className="button button-outline button-lg">Log in to your account</Link></div>
        <p className="hero-note"><ShieldCheck size={15} /> Private grievance tracking · Clear status updates · Resolution proof</p>
      </div>
      <div className="hero-visual" aria-label="Illustration of neighbours and a municipal streetlight repair" role="img">
        <div className="hero-visual-top"><span className="tiny-live"><i /> A civic issue, moving forward</span><span className="hero-illustration-label">NAGARSAATHI · DEMO</span></div>
        <svg viewBox="0 0 640 440" className="city-illustration" aria-hidden="true">
          <rect x="25" y="26" width="590" height="385" rx="26" fill="#e7f1ed" />
          <circle cx="506" cy="102" r="43" fill="#f1d6a3" />
          <path d="M44 260 165 180l95 63 109-102 111 89 89-54v135H44Z" fill="#bdcfc4" />
          <path d="M77 209h112v129H77zm142-31h121v160H219zm157 39h128v121H376z" fill="#f7f5ec" />
          <path d="M96 236h27v40H96zm47 0h27v40h-27zm91-23h31v49h-31zm52 0h31v49h-31zm112 27h32v43h-32zm54 0h32v43h-32z" fill="#8aa29a" />
          <path d="M46 338h550" stroke="#fff" strokeWidth="14" />
          <path d="M41 350h557v66H41z" fill="#53616b" />
          <path d="M92 384h86m76 0h86m76 0h86" stroke="#e8e3d6" strokeWidth="8" strokeLinecap="round" />
          <path d="M498 330V133" stroke="#394b55" strokeWidth="11" strokeLinecap="round" />
          <path d="M497 138q0-31 42-31h32" fill="none" stroke="#394b55" strokeWidth="10" strokeLinecap="round" />
          <path d="M566 98h21v15h-21z" fill="#0f766e" />
          <path d="m566 114 28 15h-54Z" fill="#0f766e" opacity=".2" />
          <path d="M293 315c5-31 25-51 54-51 26 0 46 20 49 51" fill="#0f766e" />
          <circle cx="347" cy="250" r="21" fill="#d79a76" />
          <path d="M351 267 333 299l40 10 14-30" fill="#e7ae89" />
          <path d="m346 306-15 42m40-40 21 40" stroke="#31434e" strokeWidth="11" strokeLinecap="round" />
          <path d="M271 291h-42l-13 42h74Z" fill="#c88f63" />
          <circle cx="251" cy="274" r="17" fill="#a86e50" />
          <path d="M228 332v16m44-16v16" stroke="#34454f" strokeWidth="8" strokeLinecap="round" />
          <path d="M106 116c9-25 35-40 64-34 27-26 76-15 86 21 30 5 40 44 11 59H107c-26-13-22-38-1-46Z" fill="#fff" opacity=".75" />
          <path d="M112 118h143" stroke="#fff" strokeWidth="7" strokeLinecap="round" opacity=".8" />
          <circle cx="541" cy="299" r="24" fill="#d8aa7a" />
          <path d="M515 328h55v54h-55z" fill="#98b48c" />
        </svg>
        <div className="hero-status-card"><div className="hero-status-icon"><CheckCircle2 size={17} /></div><div><strong>Visible from report to resolution</strong><span>One shared civic record</span></div><ArrowDown size={15} className="hero-status-arrow" /></div>
      </div>
    </section>

    <section className="lifecycle-section" aria-labelledby="lifecycle-title">
      <div className="lifecycle-heading"><p className="eyebrow">A simple, accountable process</p><h2 id="lifecycle-title">Every report has a next step.</h2></div>
      <div className="lifecycle-track">
        {["Filed", "Triaged", "Assigned", "In progress", "Resolved"].map((status, index) => <React.Fragment key={status}>
          <div className={`lifecycle-node lifecycle-node-${index + 1}`}><span className="lifecycle-number">0{index + 1}</span><span>{status}</span></div>
          {index < 4 ? <span className="lifecycle-connector" aria-hidden="true" /> : null}
        </React.Fragment>)}
      </div>
      <p className="lifecycle-caption">From a resident’s first report to a contractor’s before-and-after proof.</p>
    </section>

    <section className="audience-section" aria-labelledby="audience-title">
      <div className="audience-header"><div><p className="eyebrow">One record, four perspectives</p><h2 id="audience-title">Built for the people who move service forward.</h2></div><p>Each person sees the information and action that belongs to their role.</p></div>
      <div className="audience-grid">
        {roleCards.map(({ title, text, icon: Icon, tone }) => <article className="audience-card" key={title}>
          <div className={`audience-icon audience-${tone}`}><Icon size={20} strokeWidth={1.8} /></div><h3>{title}</h3><p>{text}</p><span className="audience-rule" />
        </article>)}
      </div>
    </section>

    <section className="landing-bottom-cta">
      <div><p className="eyebrow">A trusted civic process</p><h2>Start with what’s happening on your street.</h2><p>File a report, share what you see, and stay informed about what happens next.</p></div>
      <Button size="lg" icon={ArrowRight} onClick={() => router.push("/register")}>Create an account</Button>
    </section>
    <p className="landing-demo-disclaimer"><LockKeyhole size={14} /> NagarSaathi demo · The role workspaces use local sample data and are not connected to a municipal service.</p>
  </div>;
}

function LoginPage() {
  const router = useRouter();
  const { data, setCurrentUser, enterDemoRole, toast } = useDemo();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [rateLimited, setRateLimited] = useState(false);
  const [showDemo, setShowDemo] = useState(true);

  const goRole = (role: Role) => {
    enterDemoRole(role);
    toast(`${ROLE_COPY[role].label} demo workspace opened. This is not real authentication.`, "info");
    router.push(safeDestination(role));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError("Enter a valid email address."); return; }
    if (!password) { setError("Enter a password to continue."); return; }
    if (rateLimited) return;
    setLoading(true);
    await new Promise((resolve) => window.setTimeout(resolve, 420));
    const user = data.users.find((item) => item.email.toLowerCase() === email.trim().toLowerCase());
    if (!user || password.toLowerCase() === "wrong") {
      const nextAttempts = attempts + 1;
      setAttempts(nextAttempts);
      setLoading(false);
      if (nextAttempts >= 5) {
        setRateLimited(true);
        setError("Too many unsuccessful demo sign-in attempts. Try again in 15 minutes, or use a demo role below.");
      } else setError("Those details don’t match a demo account. Use a demo role below or check the email address.");
      return;
    }
    if (!user.confirmedAt) {
      setLoading(false);
      setError("This demo account has not completed email verification. Continue to the verification screen.");
      return;
    }
    setCurrentUser(user.id);
    setLoading(false);
    toast("Signed in to the local demo workspace.");
    router.push(safeDestination(user.role));
  };

  return <div className="auth-page auth-login-page">
    <div className="auth-intro"><div className="auth-icon"><LockKeyhole size={21} /></div><p className="eyebrow">Welcome back</p><h1>Log in to NagarSaathi</h1><p>Continue to your role-based civic workspace.</p></div>
    <div className="auth-grid">
      <section className="auth-card">
        <div className="auth-card-heading"><h2>Account sign-in</h2><p>Enter a sample account email and any password to try the local demo.</p></div>
        <form className="form-stack" onSubmit={submit} noValidate>
          <Field id="login-email" label="Email address" required hint="Demo accounts are listed under role access.">
            <input className="control" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.in" />
          </Field>
          <Field id="login-password" label="Password" required>
            <input className="control" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" />
          </Field>
          {error ? <div className={`inline-message ${rateLimited ? "inline-error" : "inline-error"}`} role="alert"><span aria-hidden="true">!</span><p>{error}</p>{error.includes("verification") ? <Link href="/verify?state=pending">Open verification</Link> : null}</div> : null}
          <Button type="submit" size="lg" loading={loading} disabled={rateLimited}>Log in</Button>
        </form>
        <div className="auth-links"><Link href="/forgot-password">Forgot password?</Link><span>New to NagarSaathi? <Link href="/register">Create an account</Link></span></div>
        <p className="auth-privacy-note"><LockKeyhole size={13} /> This is a frontend demo. No password is sent or checked by a server.</p>
      </section>
      <section className="demo-access-card">
        <div className="demo-access-head"><div><span className="demo-label"><span /> DEMO MODE</span><h2>Explore a role</h2></div><button type="button" className="text-button" onClick={() => setShowDemo(!showDemo)} aria-expanded={showDemo}>{showDemo ? "Hide" : "Show"}</button></div>
        <p>Choose a sample role to enter its workspace. You can switch roles later from the account menu.</p>
        {showDemo ? <div className="demo-role-list">
          {DEMO_ROLES.map(({ role, name, detail, icon: Icon }) => <button type="button" className="demo-role-button" key={role} onClick={() => goRole(role)}>
            <span className={`demo-role-icon demo-role-${role}`}><Icon size={18} /></span><span className="demo-role-copy"><strong>{ROLE_COPY[role].label}</strong><small>{name} · {detail}</small></span><ArrowRight size={17} className="demo-role-arrow" />
          </button>)}
        </div> : null}
        <div className="demo-local-note"><ShieldCheck size={16} /><span>Role selection is a navigation simulation, not real authentication or authorization.</span></div>
      </section>
    </div>
  </div>;
}

function RegisterPage() {
  const router = useRouter();
  const { data, registerDemoUser, toast } = useDemo();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"citizen" | "contractor">("citizen");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (name.trim().length < 2) next.name = "Enter your name (at least 2 characters).";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) next.email = "Enter a valid email address.";
    if (data.users.some((user) => user.email.toLowerCase() === email.trim().toLowerCase())) next.email = "An account with this demo email already exists.";
    if (!password) next.password = "Enter a password to continue.";
    setErrors(next);
    if (Object.keys(next).length) {
      document.getElementById(Object.keys(next)[0] === "name" ? "register-name" : Object.keys(next)[0] === "email" ? "register-email" : "register-password")?.focus();
      return;
    }
    setLoading(true);
    await new Promise((resolve) => window.setTimeout(resolve, 300));
    const user = registerDemoUser(name.trim(), email.trim(), role);
    window.sessionStorage.setItem("nagarsaathi.pending-verification", user.id);
    setLoading(false);
    toast("Demo registration saved in this browser. Email verification is simulated.", "info");
    router.push("/thank-you");
  };

  return <div className="auth-page auth-narrow-page">
    <div className="auth-intro"><div className="auth-icon"><Users size={21} /></div><p className="eyebrow">Join your civic workspace</p><h1>Create an account</h1><p>Choose the role that best describes how you’ll use NagarSaathi.</p></div>
    <section className="auth-card auth-card-wide">
      <form className="form-stack" onSubmit={submit} noValidate>
        <Field id="register-name" label="Full name" required error={errors.name}><input className="control" value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" placeholder="Your name" /></Field>
        <Field id="register-email" label="Email address" required error={errors.email}><input className="control" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="you@example.in" /></Field>
        <Field id="register-password" label="Password" required hint="This demo stores no password and does not create a real account." error={errors.password}><input className="control" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" placeholder="Choose a password" /></Field>
        <fieldset className="role-choice-group">
          <legend>Register as <span className="required-label">· Required</span></legend>
          <div className="role-choice-grid">
            <label className={`role-choice ${role === "citizen" ? "role-choice-selected" : ""}`}><input type="radio" name="role" value="citizen" checked={role === "citizen"} onChange={() => setRole("citizen")} /><span className="role-choice-icon"><Users size={19} /></span><span><strong>Citizen</strong><small>Report and follow local issues</small></span></label>
            <label className={`role-choice ${role === "contractor" ? "role-choice-selected" : ""}`}><input type="radio" name="role" value="contractor" checked={role === "contractor"} onChange={() => setRole("contractor")} /><span className="role-choice-icon"><HardHat size={19} /></span><span><strong>Contractor</strong><small>Bid and complete civic work</small></span></label>
          </div>
        </fieldset>
        {Object.keys(errors).length >= 3 ? <div className="form-error-summary" role="alert"><strong>Please review {Object.keys(errors).length} fields.</strong><ul>{Object.entries(errors).map(([key, value]) => <li key={key}><a href={`#register-${key}`}>{value}</a></li>)}</ul></div> : null}
        <Button type="submit" size="lg" loading={loading}>Continue to email verification</Button>
      </form>
      <p className="auth-bottom-link">Already registered? <Link href="/login">Log in</Link></p>
      <p className="auth-privacy-note"><ShieldCheck size={13} /> Staff and admin accounts are not available through public registration.</p>
    </section>
  </div>;
}

function VerifyPage() {
  const router = useRouter();
  const { data, confirmUser, toast } = useDemo();
  const [state, setState] = useState<"pending" | "success" | "expired" | "failure">("pending");
  const [resend, setResend] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  useEffect(() => {
    setPendingId(window.sessionStorage.getItem("nagarsaathi.pending-verification"));
    const query = new URLSearchParams(window.location.search);
    if (query.get("state") === "expired") setState("expired");
    else if (query.get("state") === "failure") setState("failure");
  }, []);
  const pendingUser = pendingId ? data.users.find((user) => user.id === pendingId) : null;

  const verify = () => {
    if (pendingId && confirmUser(pendingId)) {
      setState("success");
      return;
    }
    setState("success");
    toast("This verification state was simulated for the demo.", "info");
  };

  const continueToWorkspace = () => {
    const user = pendingId ? data.users.find((item) => item.id === pendingId) : null;
    if (pendingId) window.sessionStorage.removeItem("nagarsaathi.pending-verification");
    if (user) router.push(user.role === "contractor" ? "/dashboard/contractor/onboarding" : HOME_FOR_ROLE[user.role]);
    else router.push("/login");
  };

  return <div className="auth-page auth-narrow-page">
    <div className={`verification-symbol verification-${state}`} aria-hidden="true">{state === "success" ? <CheckCircle2 size={28} /> : state === "pending" ? <Mail size={27} /> : <FileCheck2 size={27} />}</div>
    <p className="eyebrow">Email verification</p>
    <h1 className="auth-centered-title">{state === "success" ? "Email verified" : state === "expired" ? "This link has expired" : state === "failure" ? "We couldn’t verify this link" : "Verify your email"}</h1>
    {state === "success" ? <div className="auth-card auth-centered-card"><p>Your demo account is ready{pendingUser ? `, ${pendingUser.name}` : ""}. Continue to the right workspace when you’re ready.</p><Button size="lg" icon={ArrowRight} onClick={continueToWorkspace}>Continue to workspace</Button><p className="auth-privacy-note">Verification is simulated locally. No email service is connected.</p></div> : state === "expired" || state === "failure" ? <div className="auth-card auth-centered-card"><p>{state === "expired" ? "Verification links can expire. Request a new link to continue." : "The link may be invalid or already used. You can request another demo verification link."}</p><Button onClick={() => { setResend(true); setState("pending"); }}>Resend verification link</Button>{resend ? <p className="inline-success" role="status">A new demo verification link is ready. Use the button below to complete it.</p> : null}<Link href="/login" className="auth-secondary-link">Return to log in</Link></div> : <div className="auth-card auth-centered-card"><p>{pendingUser ? `Complete the email step for ${pendingUser.email}.` : "Open the verification link from your email. In this prototype, use the control below to simulate that step."}</p><div className="verification-demo-note"><ShieldCheck size={16} /><span>This is a frontend-only verification demo. No email is sent.</span></div><Button size="lg" icon={CheckCircle2} onClick={verify}>Simulate email verified</Button><button type="button" className="text-button" onClick={() => setState("expired")}>Show expired-link state</button></div>}
  </div>;
}

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError("Enter a valid email address."); return; }
    setLoading(true);
    await new Promise((resolve) => window.setTimeout(resolve, 300));
    setLoading(false);
    setSent(true);
  };
  return <div className="auth-page auth-narrow-page">
    <div className="auth-intro"><div className="auth-icon"><Mail size={21} /></div><p className="eyebrow">Account recovery</p><h1>Forgot your password?</h1><p>Enter your email address to continue with the recovery demo.</p></div>
    <section className="auth-card auth-card-wide">
      {sent ? <div className="auth-success-panel" role="status"><CheckCircle2 size={22} /><div><strong>Check your inbox</strong><p>If an account matches that address, we’ll send recovery instructions.</p></div></div> : <form className="form-stack" onSubmit={submit} noValidate>
        <Field id="forgot-email" label="Email address" required error={error}><input type="email" className="control" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.in" autoComplete="email" /></Field>
        <Button type="submit" size="lg" loading={loading}>Send recovery instructions</Button>
      </form>}
      <p className="auth-bottom-link"><Link href="/login">Back to log in</Link></p>
      <p className="auth-privacy-note"><LockKeyhole size={13} /> The message stays the same whether or not an account exists.</p>
    </section>
  </div>;
}

function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [loading, setLoading] = useState(false);
  React.useEffect(() => {
    if (new URLSearchParams(window.location.search).get("invalid") === "1") setInvalid(true);
  }, []);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (!password || !confirm) { setError("Enter and confirm your new password."); return; }
    if (password !== confirm) { setError("The passwords don’t match. Check both fields and try again."); return; }
    setLoading(true);
    await new Promise((resolve) => window.setTimeout(resolve, 300));
    setLoading(false);
    setSuccess(true);
  };
  return <div className="auth-page auth-narrow-page">
    <div className="auth-intro"><div className="auth-icon"><LockKeyhole size={21} /></div><p className="eyebrow">Account recovery</p><h1>{success ? "Password updated" : "Set a new password"}</h1><p>{success ? "Your password reset was simulated successfully." : "Choose a new password to finish the recovery demo."}</p></div>
    <section className="auth-card auth-card-wide">
      {success ? <div className="auth-success-panel" role="status"><CheckCircle2 size={22} /><div><strong>You’re all set</strong><p>Continue to sign in to your demo workspace.</p><Link href="/login">Go to log in</Link></div></div> : invalid ? <div className="auth-expired-panel" role="alert"><div className="error-icon">!</div><div><strong>This recovery link is invalid or expired</strong><p>Request a new password recovery link and try again.</p><Link href="/forgot-password">Request a new link</Link></div></div> : <form className="form-stack" onSubmit={submit} noValidate>
        <Field id="reset-password" label="New password" required><input type="password" className="control" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" /></Field>
        <Field id="reset-confirm" label="Confirm new password" required><input type="password" className="control" value={confirm} onChange={(event) => setConfirm(event.target.value)} autoComplete="new-password" /></Field>
        {error ? <p className="field-error" role="alert">{error}</p> : null}
        <Button type="submit" size="lg" loading={loading}>Update password</Button>
      </form>}
      {!success ? <p className="auth-bottom-link"><Link href="/login">Back to log in</Link></p> : null}
      <p className="auth-privacy-note"><ShieldCheck size={13} /> This form only simulates a local recovery flow.</p>
    </section>
  </div>;
}

function ThankYouPage() {
  return <div className="auth-page auth-narrow-page">
    <div className="verification-symbol verification-success" aria-hidden="true"><Mail size={27} /></div>
    <p className="eyebrow">One last step</p><h1 className="auth-centered-title">Check your email to verify your account</h1>
    <section className="auth-card auth-centered-card"><p>We’ve saved this demo registration in your browser. Email verification is next before you enter the workspace.</p><div className="verification-demo-note"><ShieldCheck size={16} /><span>No email is sent from this prototype. Continue to the simulated verification screen.</span></div><Link href="/verify" className="button button-primary button-lg">Continue to verification <ArrowRight size={17} /></Link><p className="auth-bottom-link"><Link href="/login">Return to log in</Link></p></section>
  </div>;
}

function NotFoundPage() {
  return <div className="not-found-public"><div className="not-found-mark">404</div><p className="eyebrow">Page not found</p><h1>We can’t find that page.</h1><p>The link may have moved, or the page may not be available in this demo.</p><div className="hero-actions"><Link href="/" className="button button-primary button-md">Back to home</Link><Link href="/login" className="button button-outline button-md">Open demo workspaces</Link></div></div>;
}
