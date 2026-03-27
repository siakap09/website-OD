import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login", // If not logged in, always go here
  },
});

// This "matcher" tells Next.js which pages to protect.
// We want to protect everything EXCEPT the login page itself.
export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|login).*)",
  ],
};