import {
  getIdTokenResult,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { auth } from "./firebase";

export async function login(email, password) {
  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const token = await getIdTokenResult(credential.user, true);
    if (token.claims.teacher !== true && token.claims.admin !== true) {
      await signOut(auth);
      return {
        ok: false,
        message: "Tài khoản chưa được cấp quyền giáo viên.",
      };
    }
    return { ok: true };
  } catch (error) {
    if (
      error.code === "auth/invalid-credential" ||
      error.code === "auth/user-not-found" ||
      error.code === "auth/wrong-password"
    ) {
      return { ok: false, message: "Email hoặc mật khẩu không chính xác." };
    }
    return { ok: false, message: error.message };
  }
}

export function logout() {
  return signOut(auth);
}

export function getUser() {
  return auth.currentUser?.email || "";
}

export function subscribeTeacherState(callback) {
  let active = true;
  const unsubscribe = onAuthStateChanged(auth, async (user) => {
    if (!user) {
      if (active) callback({ user: null, isTeacher: false, isAdmin: false });
      return;
    }

    try {
      const token = await getIdTokenResult(user, true);
      if (active) {
        callback({
          user,
          isTeacher:
            token.claims.teacher === true || token.claims.admin === true,
          isAdmin: token.claims.admin === true,
        });
      }
    } catch (error) {
      if (active) callback({ user, isTeacher: false, isAdmin: false, error });
    }
  });

  return () => {
    active = false;
    unsubscribe();
  };
}
