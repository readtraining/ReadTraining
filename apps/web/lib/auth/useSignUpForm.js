"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  AUTH_ROUTES,
  EMAIL_PATTERN,
  registerAccount,
  signUpWithProvider,
} from "./authClient";
import { safeNext } from "@/lib/safeNext";

// Sign-up behaviour (state, validation, submit flow) kept separate from the UI
// so any sign-up layout can reuse it. Swap the authClient stubs for real calls
// later; no UI changes needed.

export const SIGNUP_BUTTON_LABELS = {
  idle: "Sign up",
  validating: "Validating",
  submitting: "Creating account",
  success: "Account created",
};

export const PASSWORD_ERROR = "Use at least 8 characters, with a letter and a number.";
// the password rule, shared with the new-password page
export const weakPassword = (password) => password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password);

export function validateSignUp({ firstName, lastName, email, password, confirmPassword }) {
  const errors = {};
  if (!firstName.trim()) errors.firstName = "Enter your first name.";
  if (!lastName.trim()) errors.lastName = "Enter your last name.";
  if (!email.trim()) errors.email = "Enter your email address.";
  else if (!EMAIL_PATTERN.test(email.trim()))
    errors.email = "Enter a valid email address.";
  if (!password) errors.password = "Enter a password.";
  else if (weakPassword(password))
    errors.password = PASSWORD_ERROR;
  if (!confirmPassword) errors.confirmPassword = "Confirm your password.";
  else if (password && confirmPassword !== password)
    errors.confirmPassword = "Passwords don't match.";
  return errors;
}

export function useSignUpForm() {
  const router = useRouter();
  const [values, setValues] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    marketingOptIn: false,
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [status, setStatus] = useState("idle"); // idle | validating | submitting | success | sent (check your email)
  const [socialLoading, setSocialLoading] = useState("");
  const redirectTimer = useRef(null);

  useEffect(() => () => clearTimeout(redirectTimer.current), []);

  const busy = status !== "idle" || Boolean(socialLoading);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setValues((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
    if (fieldErrors[name]) setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    if (formError) setFormError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setFormError("");
    setStatus("validating");

    // Brief pause so the "Validating" state is visible; validation itself is sync.
    await new Promise((resolve) => setTimeout(resolve, 400));
    const errors = validateSignUp(values);
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      setStatus("idle");
      return;
    }

    setStatus("submitting");
    try {
      // ?next= (for example from "Become a provider" or "Create a business account" via log in): the confirmation email
      // and the first sign-in continue there
      const next = safeNext(new URLSearchParams(window.location.search).get("next"), AUTH_ROUTES.afterLogin);
      const result = await registerAccount({
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        email: values.email.trim(),
        password: values.password,
        marketingOptIn: values.marketingOptIn,
        next,
      });
      // the project requires email confirmation: the account opens from the link in the email
      if (result.needsConfirmation) return setStatus("sent");
      setStatus("success");
      redirectTimer.current = setTimeout(
        () => router.push(next),
        1200
      );
    } catch (err) {
      setFormError(err?.message || "We couldn't create your account. Please try again.");
      setStatus("idle");
    }
  };

  const handleSocial = async (provider) => {
    if (busy) return;
    setFormError("");
    setSocialLoading(provider);
    try {
      await signUpWithProvider(provider);
      router.push(AUTH_ROUTES.afterLogin);
    } catch (err) {
      setFormError(err?.message || "Social sign-up failed. Please try again.");
    } finally {
      setSocialLoading("");
    }
  };

  return {
    values,
    fieldErrors,
    formError,
    status,
    busy,
    handleChange,
    handleSubmit,
    handleSocial,
  };
}
