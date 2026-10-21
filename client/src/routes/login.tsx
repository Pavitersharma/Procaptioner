import { createFileRoute } from "@tanstack/react-router";
import { SignInPage } from "./signin";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [{ title: "Sign In — ProCaptioner" }],
  }),
  component: SignInPage,
});
