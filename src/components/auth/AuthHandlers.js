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
import { doc, setDoc, writeBatch } from "firebase/firestore";

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

    // Batch operations kullanarak tüm verileri tek seferde kaydet
    const batch = writeBatch(db);
    
    // Ana kullanıcı dokümanı
    const userDocRef = doc(db, "users", userCredential.user.uid);
    batch.set(userDocRef, {
      profile: {
        age: null,
        birthDate: null,
        firstName: loginData.firstName,
        gender: "",
        height: "",
        lastName: loginData.lastName,
        profileImage: "",
        username: loginData.username,
        weight: "",
      },
      notificationWindow: {
        start: "08:00",
        end: "22:00"
      },
      profileCompletionShown: false,
      createdAt: new Date(),
      lastLoginAt: new Date()
    });

    // Su verileri
    const waterDocRef = doc(db, "users", userCredential.user.uid, "water", "current");
    batch.set(waterDocRef, {
      waterIntake: 0,
      dailyWaterTarget: 2000,
      glassSize: 250,
      waterNotificationOption: "smart",
      activityLevel: "orta",
      createdAt: new Date()
    });

    // API kullanım sayaçları
    const exerciseUsageRef = doc(db, "users", userCredential.user.uid, "apiUsage", "exerciseAI");
    batch.set(exerciseUsageRef, {
      date: new Date().toISOString().slice(0, 10),
      count: 0
    });

    const healthUsageRef = doc(db, "users", userCredential.user.uid, "apiUsage", "healthDashboard");
    batch.set(healthUsageRef, {
      date: new Date().toISOString().slice(0, 10),
      count: 0
    });

    // Tüm işlemleri tek seferde commit et
    await batch.commit();

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
    if (process.env.NODE_ENV === 'development') {
    console.log("Şifre sıfırlama isteği gönderiliyor:", email);
    }
    await sendPasswordResetEmail(auth, email);
    if (process.env.NODE_ENV === 'development') {
    console.log("Şifre sıfırlama e-postası başarıyla gönderildi");
    }
    toast.success("Şifre sıfırlama e-postası gönderildi!");
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
    console.error("Şifre sıfırlama hatası:", error);
    console.error("Hata kodu:", error.code);
    console.error("Hata mesajı:", error.message);
    }
    
    switch (error.code) {
      case "auth/user-not-found":
        toast.error("Bu e-posta adresi ile kayıtlı kullanıcı bulunamadı");
        break;
      case "auth/invalid-email":
        toast.error("Geçersiz e-posta formatı");
        break;
      case "auth/too-many-requests":
        toast.error("Çok fazla istek gönderildi. Lütfen daha sonra tekrar deneyin");
        break;
      case "auth/network-request-failed":
        toast.error("Ağ bağlantısı hatası. İnternet bağlantınızı kontrol edin");
        break;
      default:
        toast.error(`Şifre sıfırlama işlemi başarısız oldu: ${error.message}`);
    }
  }
};
