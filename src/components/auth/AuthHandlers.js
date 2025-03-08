import { toast } from "react-toastify";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile, // eklenen import
} from "firebase/auth";
import { auth, db } from "./firebaseConfig"; // db eklenmeli
import { doc, setDoc } from "firebase/firestore";

export const handleLogin = async (e, { loginData, setUser, setLoginData }) => {
  e.preventDefault();

  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      loginData.username,
      loginData.password
    );

    setUser(userCredential.user);
    toast.success("Giriş başarılı!");
    setLoginData({ username: "", password: "" });
  } catch (error) {
    console.error("Giriş hatası:", error);
    switch (error.code) {
      case "auth/user-not-found":
        toast.error("Kullanıcı bulunamadı");
        break;
      case "auth/wrong-password":
        toast.error("Hatalı şifre");
        break;
      case "auth/invalid-email":
        toast.error("Geçersiz email formatı");
        break;
      default:
        toast.error("Giriş işlemi başarısız oldu");
    }
  }
};

export const handleRegister = async (
  e,
  { loginData, setUser, setLoginData }
) => {
  e.preventDefault();

  if (loginData.password.length < 8) {
    toast.error("Şifre en az 8 karakter olmalıdır");
    return;
  }

  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      loginData.username,
      loginData.password
    );

    // E-posta doğrulama gönderimi
    await sendEmailVerification(userCredential.user);
    const now = Date.now();
    localStorage.setItem("lastEmailSent", now);

    // Firestore'da kullanıcının dokümanına "profile" adlı map alanı ekleniyor.
    // Bu alanda age, birthDate, firstName, gender, height, lastName, profileImage, username, weight gibi alanlar yer alıyor.
    await setDoc(
      doc(db, "users", userCredential.user.uid),
      {
        profile: {
          age: null,
          birthDate: null, // İsteğe bağlı; henüz alınmadıysa null
          firstName: loginData.firstName,
          gender: "",
          height: "",
          lastName: loginData.lastName,
          profileImage: "",
          username: loginData.username,
          weight: "",
        },
      },
      { merge: true }
    );

    setUser(userCredential.user);
    toast.success("Kayıt başarılı! E-posta doğrulama gönderildi.");
    setLoginData({
      username: "",
      password: "",
      firstName: "",
      lastName: "",
      confirmPassword: "",
    });
  } catch (error) {
    console.error("Kayıt hatası:", error);
    switch (error.code) {
      case "auth/email-already-in-use":
        toast.error("Bu email adresi zaten kullanımda");
        break;
      case "auth/invalid-email":
        toast.error("Geçersiz email formatı");
        break;
      case "auth/weak-password":
        toast.error("Şifre çok zayıf");
        break;
      default:
        toast.error("Kayıt işlemi başarısız oldu");
    }
  }
};

export const handleLogout = async (setUser) => {
  try {
    await signOut(auth);
    setUser(null);
    toast.success("Çıkış yapıldı");
  } catch (error) {
    console.error("Çıkış hatası:", error);
    toast.error("Çıkış işlemi başarısız oldu");
  }
};

export const handlePasswordReset = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
    toast.success("Şifre sıfırlama e-postası gönderildi!");
  } catch (error) {
    console.error("Şifre sıfırlama hatası:", error);
    toast.error("Şifre sıfırlama işlemi başarısız oldu");
  }
};
