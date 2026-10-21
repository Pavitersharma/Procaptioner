import { createFileRoute } from "@tanstack/react-router";
import { SignUpPage } from "./signup";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [{ title: "Create Account — ProCaptioner" }],
  }),
  component: SignUpPage,
});
