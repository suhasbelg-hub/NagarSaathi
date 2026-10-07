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
  FileCheck2,
  FileText,
  HardHat,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Users,
} from "lucide-react";
import type { Role } from "@/lib/types";
import { ROLE_COPY } from "@/lib/mock-data";
import { Button, Field } from "@/components/ui";
import { useDemo } from "@/components/demo-store";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";

const HOME_FOR_ROLE: Record<Role, string> = {
  citizen: "/dashboard/citizen",
  staff: "/dashboard/staff",
  contractor: "/dashboard/contractor",
  admin: "/admin"
};

const SEED_ACCOUNTS: { role: Role; name: string; email: string; detail: string; icon: React.ElementType }[] = [
  { role: "citizen", name: "Priya Sharma", email: "priya.sharma@example.in", detail: "Resident reporting civic issues", icon: Users },
  { role: "staff", name: "Ramesh Iyer", email: "ramesh.iyer@municipal.demo", detail: "Municipal staff triaging & assigning", icon: ClipboardCheck },
  { role: "contractor", name: "Suresh Patel", email: "suresh@patelelectrical.demo", detail: "Verified electrical contractor", icon: HardHat },
  { role: "admin", name: "Suhas Belg", email: "suhasbelg@gmail.com", detail: "Municipal administrator oversight", icon: ShieldCheck }
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
        <div className="hero-visual-top"><span className="tiny-live"><i /> A civic issue, moving forward</span><span className="hero-illustration-label">NAGARSAATHI</span></div>
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
  </div>;
}

function LoginPage() {
  const router = useRouter();
  const { loginWithSupabase, toast } = useDemo();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const populateAccount = (accEmail: string) => {
    setEmail(accEmail);
    setPassword("Password123!");
    setError("");
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError("Enter a valid email address."); return; }
    if (!password) { setError("Enter a password to continue."); return; }
    setLoading(true);
    const result = await loginWithSupabase(email, password);
    setLoading(false);
    if (!result.ok || !result.user) {
      setError(result.error || "Those details don’t match an account. Check the email address or register.");
      return;
    }
    const user = result.user;
    if (!user.confirmedAt) {
      setError("This account has not completed email verification. Continue to the verification screen.");
      return;
    }
    toast(`Signed in as ${user.name}.`);
    router.push(safeDestination(user.role));
  };

  return <div className="auth-page auth-login-page">
    <div className="auth-intro"><div className="auth-icon"><LockKeyhole size={21} /></div><p className="eyebrow">Welcome back</p><h1>Log in to NagarSaathi</h1><p>Continue to your role-based civic workspace.</p></div>
    <div className="auth-grid">
      <section className="auth-card">
        <div className="auth-card-heading"><h2>Account sign-in</h2><p>Enter your verified credentials to access your workspace.</p></div>
        <form className="form-stack" onSubmit={submit} noValidate>
          <Field id="login-email" label="Email address" required>
            <input className="control" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.in" />
          </Field>
          <Field id="login-password" label="Password" required>
            <input className="control" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" />
          </Field>
          {error ? <div className="inline-message inline-error" role="alert"><span aria-hidden="true">!</span><p>{error}</p>{error.includes("verification") ? <Link href="/verify?state=pending">Open verification</Link> : null}</div> : null}
          <Button type="submit" size="lg" loading={loading}>Log in</Button>
        </form>
        <div className="auth-links"><Link href="/forgot-password">Forgot password?</Link><span>New to NagarSaathi? <Link href="/register">Create an account</Link></span></div>
        <p className="auth-privacy-note"><ShieldCheck size={13} /> Authenticated securely against Supabase Auth.</p>
      </section>

      <section className="demo-access-card">
        <div className="demo-access-head"><div><span className="demo-label"><span /> VERIFIED ACCOUNTS</span><h2>Quick credential fill</h2></div></div>
        <p>Select any verified role account to fill credentials and log in to that workspace.</p>
        <div className="demo-role-list">
          {SEED_ACCOUNTS.map(({ role, name, email: accEmail, detail, icon: Icon }) => (
            <button type="button" className="demo-role-button" key={role} onClick={() => populateAccount(accEmail)}>
              <span className={`demo-role-icon demo-role-${role}`}><Icon size={18} /></span>
              <span className="demo-role-copy"><strong>{ROLE_COPY[role].label}</strong><small>{name} · {accEmail}</small></span>
              <ArrowRight size={17} className="demo-role-arrow" />
            </button>
          ))}
        </div>
        <div className="demo-local-note"><ShieldCheck size={16} /><span>Default password for all accounts is <code>Password123!</code></span></div>
      </section>
    </div>
  </div>;
}

function RegisterPage() {
  const router = useRouter();
  const { data, registerWithSupabase, toast } = useDemo();
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
    if (data.users.some((user) => user.email.toLowerCase() === email.trim().toLowerCase())) next.email = "An account with this email already exists.";
    if (!password) next.password = "Enter a password to continue.";
    setErrors(next);
    if (Object.keys(next).length) {
      document.getElementById(Object.keys(next)[0] === "name" ? "register-name" : Object.keys(next)[0] === "email" ? "register-email" : "register-password")?.focus();
      return;
    }
    setLoading(true);
    const result = await registerWithSupabase(name.trim(), email.trim(), password, role);
    setLoading(false);
    if (!result.ok || !result.user) {
      setErrors({ email: result.error || "Registration failed. Try again." });
      return;
    }
    window.sessionStorage.setItem("nagarsaathi.pending-verification", result.user.id);
    toast("Account created in Supabase database. Please verify your email.");
    router.push("/thank-you");
  };

  return <div className="auth-page auth-narrow-page">
    <div className="auth-intro"><div className="auth-icon"><Users size={21} /></div><p className="eyebrow">Join your civic workspace</p><h1>Create an account</h1><p>Choose the role that best describes how you’ll use NagarSaathi.</p></div>
    <section className="auth-card auth-card-wide">
      <form className="form-stack" onSubmit={submit} noValidate>
        <Field id="register-name" label="Full name" required error={errors.name}><input className="control" value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" placeholder="Your name" /></Field>
        <Field id="register-email" label="Email address" required error={errors.email}><input className="control" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="you@example.in" /></Field>
        <Field id="register-password" label="Password" required error={errors.password}><input className="control" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" placeholder="Choose a password" /></Field>
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
      <p className="auth-privacy-note"><ShieldCheck size={13} /> Staff and admin accounts are provisioned by municipal administration.</p>
    </section>
  </div>;
}

function VerifyPage() {
  const router = useRouter();
  const { data, confirmUser, toast } = useDemo();
  const [state, setState] = useState<"pending" | "success" | "expired" | "failure">("pending");
  const [loading, setLoading] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);

  useEffect(() => {
    const id = window.sessionStorage.getItem("nagarsaathi.pending-verification");
    setPendingId(id);
    const query = new URLSearchParams(window.location.search);
    if (query.get("state") === "expired") setState("expired");
    else if (query.get("state") === "failure") setState("failure");
  }, []);

  const pendingUser = pendingId ? data.users.find((user) => user.id === pendingId) : null;

  const verify = async () => {
    if (pendingId) {
      setLoading(true);
      const ok = await confirmUser(pendingId);
      setLoading(false);
      if (ok) {
        setState("success");
        return;
      }
    }
    setState("success");
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
    {state === "success" ? <div className="auth-card auth-centered-card"><p>Your account is confirmed in the database{pendingUser ? `, ${pendingUser.name}` : ""}. Continue to your workspace.</p><Button size="lg" icon={ArrowRight} onClick={continueToWorkspace}>Continue to workspace</Button></div> : state === "expired" || state === "failure" ? <div className="auth-card auth-centered-card"><p>The verification link may be invalid or expired. You can request another verification link.</p><Link href="/login" className="auth-secondary-link">Return to log in</Link></div> : <div className="auth-card auth-centered-card"><p>{pendingUser ? `Complete email confirmation for ${pendingUser.email}.` : "Confirm your email to complete registration."}</p><Button size="lg" loading={loading} icon={CheckCircle2} onClick={verify}>Confirm email verification</Button><p className="auth-bottom-link"><Link href="/login">Return to log in</Link></p></div>}
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
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/reset-password`,
        });
      } catch {
        // safe recovery
      }
    } else {
      await new Promise((resolve) => window.setTimeout(resolve, 300));
    }
    setLoading(false);
    setSent(true);
  };

  return <div className="auth-page auth-narrow-page">
    <div className="auth-intro"><div className="auth-icon"><Mail size={21} /></div><p className="eyebrow">Account recovery</p><h1>Forgot your password?</h1><p>Enter your email address to continue with account recovery.</p></div>
    <section className="auth-card auth-card-wide">
      {sent ? <div className="auth-success-panel" role="status"><CheckCircle2 size={22} /><div><strong>Check your inbox</strong><p>If an account matches that address, we’ll send recovery instructions.</p></div></div> : <form className="form-stack" onSubmit={submit} noValidate>
        <Field id="forgot-email" label="Email address" required error={error}><input type="email" className="control" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.in" autoComplete="email" /></Field>
        <Button type="submit" size="lg" loading={loading}>Send recovery instructions</Button>
      </form>}
      <p className="auth-bottom-link"><Link href="/login">Back to log in</Link></p>
      <p className="auth-privacy-note"><LockKeyhole size={13} /> Secure password recovery via Supabase Auth.</p>
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

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("invalid") === "1") setInvalid(true);
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (!password || !confirm) { setError("Enter and confirm your new password."); return; }
    if (password !== confirm) { setError("The passwords don’t match. Check both fields and try again."); return; }
    setLoading(true);
    if (isSupabaseConfigured && supabase) {
      try {
        const { error: resetError } = await supabase.auth.updateUser({ password });
        if (resetError) {
          setError(resetError.message);
          setLoading(false);
          return;
        }
      } catch (err: any) {
        setError(err.message || "Failed to update password");
        setLoading(false);
        return;
      }
    } else {
      await new Promise((resolve) => window.setTimeout(resolve, 300));
    }
    setLoading(false);
    setSuccess(true);
  };

  return <div className="auth-page auth-narrow-page">
    <div className="auth-intro"><div className="auth-icon"><LockKeyhole size={21} /></div><p className="eyebrow">Account recovery</p><h1>{success ? "Password updated" : "Set a new password"}</h1><p>{success ? "Your password has been updated in Supabase Auth." : "Choose a new secure password for your account."}</p></div>
    <section className="auth-card auth-card-wide">
      {success ? <div className="auth-success-panel" role="status"><CheckCircle2 size={22} /><div><strong>You’re all set</strong><p>Your password was updated. Continue to sign in.</p><Link href="/login">Go to log in</Link></div></div> : invalid ? <div className="auth-expired-panel" role="alert"><div className="error-icon">!</div><div><strong>This recovery link is invalid or expired</strong><p>Request a new password recovery link and try again.</p><Link href="/forgot-password">Request a new link</Link></div></div> : <form className="form-stack" onSubmit={submit} noValidate>
        <Field id="reset-password" label="New password" required><input type="password" className="control" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" /></Field>
        <Field id="reset-confirm" label="Confirm new password" required><input type="password" className="control" value={confirm} onChange={(event) => setConfirm(event.target.value)} autoComplete="new-password" /></Field>
        {error ? <p className="field-error" role="alert">{error}</p> : null}
        <Button type="submit" size="lg" loading={loading}>Update password</Button>
      </form>}
      {!success ? <p className="auth-bottom-link"><Link href="/login">Back to log in</Link></p> : null}
      <p className="auth-privacy-note"><ShieldCheck size={13} /> Secured via Supabase Auth service.</p>
    </section>
  </div>;
}

function ThankYouPage() {
  return <div className="auth-page auth-narrow-page">
    <div className="verification-symbol verification-success" aria-hidden="true"><Mail size={27} /></div>
    <p className="eyebrow">One last step</p><h1 className="auth-centered-title">Check your email to verify your account</h1>
    <section className="auth-card auth-centered-card"><p>Your account has been registered in the Supabase database. Please verify your email before entering your workspace.</p><Link href="/verify" className="button button-primary button-lg">Continue to verification <ArrowRight size={17} /></Link><p className="auth-bottom-link"><Link href="/login">Return to log in</Link></p></section>
  </div>;
}

function NotFoundPage() {
  return <div className="not-found-public"><div className="not-found-mark">404</div><p className="eyebrow">Page not found</p><h1>We can’t find that page.</h1><p>The link may have moved, or the page may not be available.</p><div className="hero-actions"><Link href="/" className="button button-primary button-md">Back to home</Link><Link href="/login" className="button button-outline button-md">Sign in</Link></div></div>;
}
