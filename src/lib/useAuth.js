import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, isAdminEmail } from "./firebase";

export function useAuth() {
  const [user, setUser] = useState(undefined); // undefined = loading
  useEffect(() => onAuthStateChanged(auth, setUser), []);
  const isAdmin = user ? isAdminEmail(user.email) : false;
  return { user, loading: user === undefined, isAdmin };
}
