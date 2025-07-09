import React, {
  useEffect,
  useState,
  useCallback,
  useRef,
  useContext,
} from "react";
import { Chart as ChartJS, ArcElement, Tooltip, Legend, Title } from "chart.js";
import { styled, keyframes, alpha } from "@mui/material/styles";
import { format } from "date-fns";
import { ToastContainer, toast } from "react-toastify";
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Container,
  Box,
  Tabs,
  Tab,
  Select,
  MenuItem,
  Paper,
  Avatar,
  Menu,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
} from "@mui/material";

// Bottom Navigation ve ikonlar
import BottomNavigation from "@mui/material/BottomNavigation";
import BottomNavigationAction from "@mui/material/BottomNavigationAction";
import HomeIcon from "@mui/icons-material/Home";
import FavoriteIcon from "@mui/icons-material/Favorite";
import DashboardIcon from "@mui/icons-material/Dashboard";
import FitnessCenterIcon from "@mui/icons-material/FitnessCenter";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import PersonIcon from "@mui/icons-material/Person";
import background from "./assets/background.jpg";

// Framer Motion ve React Icons
import { motion } from "framer-motion";
import { FaGithub, FaLinkedin, FaEnvelope, FaMedium, FaFileAlt, FaPhone } from "react-icons/fa";

import "react-toastify/dist/ReactToastify.css";
import "tippy.js/dist/tippy.css";
import "./App.css";
import UserAuth from "./components/auth/UserAuth";
import WeatherWidget from "./utils/weather-theme-notify/WeatherWidget";
import { requestNotificationPermissionAndSaveToken } from "./utils/notificationService";
import {
  initialExercises,
  initialSupplements,
  initialRoutines,
  socialLinks,
} from "./utils/constant/ConstantData";
import DailyRoutine from "./components/daily-routine/DailyRoutine";
import Exercises from "./components/exercises/exercise";
import CalendarComponent from "./components/calendar/CalendarComponent";
import WellnessTracker from "./components/wellnesstracker/WellnessTracker";
import { auth, db } from "./components/auth/firebaseConfig";
import { onAuthStateChanged, sendEmailVerification } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { handlePasswordReset } from "./components/auth/AuthHandlers";
import Lottie from "lottie-react";
import welcomeAnimation from "./assets/welcomeAnimation.json";
import HealthDashboard from "./components/health-dashboard/HealthDashboard";
import { computeAge } from "../src/utils/dateHelpers";
import BirthdayCelebration from "/src/utils/BirthdayCelebration.jsx";
import { tr } from "date-fns/locale";
import NotificationSettingsDialog from "../src/utils/NotificationSettingsDialog";
import { GlobalStateContext } from "./components/context/GlobalStateContext";
import { handleSaveNotificationWindow } from "./utils/notificationWindowUtils";
import { messaging } from "./components/auth/firebaseConfig";
import { onMessage } from "firebase/messaging";

// Animasyonlar
const float = keyframes`
  0% { transform: translateY(0px); }
  50% { transform: translateY(-20px); }
  100% { transform: translateY(0px); }
`;

const pulse = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
`;

const ripple = keyframes`
  0% { transform: scale(0.95); opacity: 0.7; }
  50% { transform: scale(1.05); opacity: 0.4; }
  100% { transform: scale(0.95); opacity: 0.7; }
`;

// Styled Components
const GlowingContainer = styled(Container, {
  shouldForwardProp: (prop) => prop !== "glowColor",
})(({ theme, glowColor }) => ({
  position: "relative",
  background: "rgba(33, 150, 243, 0.1)",
  backdropFilter: "blur(10px)",
  borderRadius: "24px",
  overflow: "hidden",
  border: "1px solid rgba(33, 150, 243, 0.2)",
  boxShadow: `0 0 20px ${glowColor || "#2196F322"}`,
  transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
  "&:hover": {
    boxShadow: `0 0 40px ${glowColor || "#2196F344"}`,
  },
}));
const AnimatedButton = styled(Button)(({ theme }) => ({
  background: "linear-gradient(45deg, #2196F3 30%, #3F51B5 90%)",
  border: 0,
  borderRadius: 25,
  boxShadow: "0 3px 5px 2px rgba(33, 150, 243, .3)",
  color: "white",
  padding: "12px 35px",
  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  position: "relative",
  overflow: "hidden",
  "&:hover": {
    transform: "scale(1.05)",
    boxShadow: "0 5px 15px 3px rgba(33, 150, 243, .4)",
  },
  "&::after": {
    content: '""',
    position: "absolute",
    top: "-50%",
    left: "-50%",
    width: "200%",
    height: "200%",
    background:
      "linear-gradient(45deg, transparent, rgba(255,255,255,0.1), transparent)",
    transform: "rotate(45deg)",
    animation: `${ripple} 2s infinite`,
  },
}));

const FloatingElement = styled(Box)(({ delay = 0 }) => ({
  animation: `${float} 3s ease-in-out infinite`,
  animationDelay: `${delay}s`,
}));

// Avatar API'den dönen avatar URL'lerini simüle eden sabit dizi
const generateAvatars = (count) =>
  Array.from(
    { length: count },
    (_, i) => `https://api.dicebear.com/6.x/adventurer/svg?seed=avatar${i + 1}`
  );

const availableAvatars = generateAvatars(200);

ChartJS.register(ArcElement, Tooltip, Legend, Title);
// Bildirim izni

function App() {
  // Bildirim ayarları
  const { user, setUser, supplements } = useContext(GlobalStateContext);
  const [openNotificationSettings, setOpenNotificationSettings] =
    useState(false);

  const handleNotificationSettingsOpen = () => {
    setOpenNotificationSettings(true);
    setAnchorEl(null); // Menü kapansın
  };

  const handleNotificationSettingsClose = () => {
    setOpenNotificationSettings(false);
  };

  // Temel state'ler
  const [isLoading, setIsLoading] = useState(true);
  const [transition, setTransition] = useState(false);
  const [activeGlow, setActiveGlow] = useState("#2196F3");

  // Kullanıcı, oturum ve genel state'ler
  const [lastEmailSent, setLastEmailSent] = useState(
    localStorage.getItem("lastEmailSent") || 0
  );
  const [authChecked, setAuthChecked] = useState(false);
  const [loginData, setLoginData] = useState({ username: "", password: "" });
  const [isRegister, setIsRegister] = useState(false);
  const [errors, setErrors] = useState({ username: false, password: false });
  const [remainingTime, setRemainingTime] = useState(0);

  // Platform ve PWA kontrolü
  const [isPWA, setIsPWA] = useState(false);
  const [platform, setPlatform] = useState('web');
  const [isIOS, setIsIOS] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    // Platform algılama
    const detectPlatform = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
      const isAndroidDevice = /android/.test(userAgent);
      const isMobileDevice = /mobile|android|iphone|ipad|ipod|blackberry|windows phone/.test(userAgent);
      
      // PWA kontrolü
      const isInStandaloneMode = () =>
        (window.matchMedia &&
          window.matchMedia("(display-mode: standalone)").matches) ||
        navigator.standalone === true;
      
      const pwaMode = isInStandaloneMode();
      
      setIsIOS(isIOSDevice);
      setIsMobile(isMobileDevice);
      setIsPWA(pwaMode);
      
      // Platform belirleme
      if (isIOSDevice && pwaMode) {
        setPlatform('ios-pwa');
      } else if (isAndroidDevice && pwaMode) {
        setPlatform('android-pwa');
      } else if (isMobileDevice) {
        setPlatform('mobile-web');
      } else {
        setPlatform('desktop-web');
      }
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`🌐 [PLATFORM] Tespit edilen platform: ${platform}`, {
          isIOS: isIOSDevice,
          isMobile: isMobileDevice,
          isPWA: pwaMode,
          userAgent: userAgent
        });
      }
    };
    
    detectPlatform();
  }, []);

  useEffect(() => {
    if (user) {
      requestNotificationPermissionAndSaveToken(user);
    }
  }, [user]);

  // Firebase Messaging: Foreground bildirimleri dinle
  useEffect(() => {
    if (!user) return;

    const unsubscribe = onMessage(messaging, (payload) => {
      if (process.env.NODE_ENV === 'development') {
        console.log("📱 [FOREGROUND] Bildirim alındı:", payload);
      }
      
      const { title, body, icon } = payload.notification || {};
      const data = payload.data || {};
      
      // Bildirim türüne göre tab indeksi belirle
      let targetTab = 0; // Varsayılan: Ana sayfa
      if (data.type === "water" || data.type === "water-reset") {
        targetTab = 1; // Yaşam Takibi tab'ı
      } else if (data.type === "pomodoro") {
        targetTab = 0; // Rutin tab'ı
      } else if (data.routineId) {
        targetTab = 0; // Rutin tab'ı
      } else if (data.eventId) {
        targetTab = 4; // Takvim tab'ı
      } else if (data.supplementId) {
        targetTab = 1; // Yaşam Takibi tab'ı
      }

      // Tab indeksine göre sayfa adını belirle
      let pageName = "Ana Sayfa";
      if (targetTab === 1) pageName = "Yaşam Takibi";
      else if (targetTab === 0) pageName = "Günlük Rutin";
      else if (targetTab === 4) pageName = "Takvim";

      // Toast bildirimi göster
      toast.info(
        <div>
          <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{title}</div>
          <div>{body}</div>
          <div style={{ fontSize: '12px', marginTop: '4px', opacity: 0.7 }}>
            Tıklayın: {pageName}
          </div>
        </div>,
        {
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          onClick: () => {
            // Bildirime tıklandığında platform bazlı yönlendirme yap
            if (process.env.NODE_ENV === 'development') {
              console.log(`🔄 [FOREGROUND] Toast bildirimine tıklandı, Platform: ${platform}, Tab ${targetTab} (${pageName})'e yönlendiriliyor`);
            }
            handlePlatformTabChange(targetTab, 'foreground_toast');
          }
        }
      );
    });

    return () => unsubscribe();
  }, [user]);

  // Sekme Yönetimi (hem Tabs hem BottomNavigation için aynı state)
  const [activeTab, setActiveTab] = useState(
    () => parseInt(localStorage.getItem("activeTab")) || 0
  );
  const handleTabChange = (newTab) => {
    try {
      // Tab indeksinin geçerli olup olmadığını kontrol et
      if (newTab >= 0 && newTab <= 4) {
        setActiveTab(newTab);
        localStorage.setItem("activeTab", newTab.toString());
        if (process.env.NODE_ENV === 'development') {
          console.log(`✅ [TAB CHANGE] Tab ${newTab} başarıyla değiştirildi`);
        }
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.warn(`⚠️ [TAB CHANGE] Geçersiz tab indeksi: ${newTab}, varsayılan tab 0'a yönlendiriliyor`);
        }
        setActiveTab(0);
        localStorage.setItem("activeTab", "0");
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error(`❌ [TAB CHANGE] Tab değişikliği hatası:`, error);
      }
      // Hata durumunda varsayılan tab'a yönlendir
      setActiveTab(0);
      localStorage.setItem("activeTab", "0");
    }
  };

  // Platform bazlı tab değişikliği fonksiyonu
  const handlePlatformTabChange = (targetTab, source = 'unknown') => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔄 [PLATFORM TAB] Platform: ${platform}, Tab: ${targetTab}, Kaynak: ${source}`);
    }
    
    try {
      if (targetTab >= 0 && targetTab <= 4) {
        // Platform bazlı gecikme süreleri
        let delay = 200; // Varsayılan
        
        switch (platform) {
          case 'ios-pwa':
            delay = 500; // iOS PWA için daha uzun bekleme
            break;
          case 'android-pwa':
            delay = 300;
            break;
          case 'mobile-web':
            delay = 250;
            break;
          case 'desktop-web':
            delay = 100;
            break;
        }
        
        setTimeout(() => {
          handleTabChange(targetTab);
          if (process.env.NODE_ENV === 'development') {
            console.log(`✅ [PLATFORM TAB] ${platform} için tab ${targetTab} değiştirildi`);
          }
        }, delay);
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.warn(`⚠️ [PLATFORM TAB] Geçersiz tab indeksi: ${targetTab}`);
        }
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error(`❌ [PLATFORM TAB] Tab değişikliği hatası:`, error);
      }
    }
  };

  // URL parametrelerini dinle ve platform bazlı yönlendirme yap
  useEffect(() => {
    const handleURLParams = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const tabParam = urlParams.get('tab');
      const notificationParam = urlParams.get('notification');
      
      if (tabParam && notificationParam === 'true') {
        const targetTab = parseInt(tabParam);
        if (process.env.NODE_ENV === 'development') {
          console.log(`🔗 [URL PARAMS] URL'den tab parametresi alındı: ${targetTab}`);
        }
        
        if (!isNaN(targetTab) && targetTab >= 0 && targetTab <= 4) {
          // URL parametresini temizle
          const newUrl = window.location.pathname;
          window.history.replaceState({}, document.title, newUrl);
          
          // Platform bazlı tab değişikliği
          handlePlatformTabChange(targetTab, 'url_params');
        }
      }
    };
    
    // Sayfa yüklendiğinde URL parametrelerini kontrol et
    handleURLParams();
    
    // Popstate event'ini dinle (geri/ileri butonları için)
    const handlePopState = () => {
      handleURLParams();
    };
    
    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [platform]);

  // Service Worker'dan gelen tab değişiklik isteklerini dinle
  useEffect(() => {
    let messageHandled = false;
    
    const handleMessage = (event) => {
      try {
        if (process.env.NODE_ENV === 'development') {
          console.log(`📨 [MESSAGE] Service Worker'dan mesaj alındı:`, event.data);
        }
        
        if (event.data && event.data.type === 'SWITCH_TAB') {
          const targetTab = event.data.targetTab;
          const timestamp = event.data.timestamp;
          const source = event.data.source || 'service_worker';
          
          // Aynı mesajın birden fazla kez işlenmesini önle (timestamp ile)
          const messageKey = `${targetTab}-${timestamp}`;
          if (messageHandled === messageKey) {
            if (process.env.NODE_ENV === 'development') {
              console.log(`�� [TAB SWITCH] Mesaj zaten işlendi, atlanıyor: ${messageKey}`);
            }
            return;
          }
          
          if (process.env.NODE_ENV === 'development') {
            console.log(`🔄 [TAB SWITCH] Service Worker'dan tab değişikliği isteği: Tab ${targetTab} (${timestamp}) - Platform: ${platform}`);
          }
          
          // Tab indeksinin geçerli olup olmadığını kontrol et
          if (targetTab >= 0 && targetTab <= 4) {
            messageHandled = messageKey;
            
            // Platform bazlı tab değişikliği
            handlePlatformTabChange(targetTab, source);
            
            // 2 saniye sonra mesaj işleme durumunu sıfırla
            setTimeout(() => {
              messageHandled = null;
            }, 2000);
          } else {
            if (process.env.NODE_ENV === 'development') {
              console.warn(`⚠️ [TAB SWITCH] Geçersiz tab indeksi: ${targetTab}`);
            }
          }
        } else if (event.data && event.data.type === 'TEST_RESPONSE') {
          if (process.env.NODE_ENV === 'development') {
            console.log(`✅ [TEST] Service Worker bağlantısı başarılı:`, event.data);
          }
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error(`❌ [TAB SWITCH] Tab değişikliği hatası:`, error);
        }
      }
    };

    // Service Worker'ı kontrol et ve mesaj dinleyicisini ekle
    const setupMessageListener = async () => {
      try {
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.ready;
          if (process.env.NODE_ENV === 'development') {
            console.log(`✅ [TAB SWITCH] Service Worker hazır:`, registration);
          }
          
          navigator.serviceWorker.addEventListener('message', handleMessage);
          if (process.env.NODE_ENV === 'development') {
            console.log(`✅ [TAB SWITCH] Service Worker mesaj dinleyicisi eklendi`);
          }
          
          // Service Worker'a test mesajı gönder
          if (registration.active) {
            registration.active.postMessage({
              type: 'TEST_CONNECTION',
              timestamp: Date.now(),
              platform: platform
            });
            if (process.env.NODE_ENV === 'development') {
              console.log(`✅ [TAB SWITCH] Test mesajı gönderildi (Platform: ${platform})`);
            }
          }
        } else {
          if (process.env.NODE_ENV === 'development') {
            console.warn(`⚠️ [TAB SWITCH] Service Worker desteklenmiyor`);
          }
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error(`❌ [TAB SWITCH] Service Worker kurulum hatası:`, error);
        }
      }
    };

    setupMessageListener();
    
    return () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleMessage);
        if (process.env.NODE_ENV === 'development') {
          console.log(`🔄 [TAB SWITCH] Service Worker mesaj dinleyicisi kaldırıldı`);
        }
      }
    };
  }, [platform]);

  // Zaman & Hava Durumu
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Egzersiz
  const [exercises, setExercises] = useState([]);
  const [editingExercise, setEditingExercise] = useState(null);
  const handleExerciseSubmit = useCallback((exercise) => {
    setExercises((prev) =>
      exercise.id
        ? prev.map((e) => (e.id === exercise.id ? exercise : e))
        : [...prev, { ...exercise, id: Date.now().toString() }]
    );
    setEditingExercise(null);
  }, []);

  // Firestore'dan Kullanıcı Verilerini Yükleme
  const isInitialLoad = useRef(true);
  const isDataLoading = useRef(true);
  const lastExercisesState = useRef([]);
  const lastRoutinesState = useRef([]);
  const lastWaterDataState = useRef(null);
  const lastCalendarEventsState = useRef([]);
  const lastSupplementsState = useRef([]);

  useEffect(() => {
    const loadUserData = async () => {
      if (!user) return;
      try {
        const userDocRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(userDocRef, { source: "server" });
        if (docSnap.exists()) {
          const data = docSnap.data();
          // Kullanıcının mevcut egzersizleri varsa onları kullan, yoksa boş dizi
          const exercisesData = data.exercises || [];
          setExercises(exercisesData);
          lastExercisesState.current = exercisesData;
          
          if (
            data.profile &&
            data.profile.birthDate &&
            data.profile.birthDate.toDate
          ) {
            data.profile.birthDate = format(
              data.profile.birthDate.toDate(),
              "yyyy-MM-dd"
            );
          }
          isInitialLoad.current = false;
          isDataLoading.current = false;
        } else {
          // Yeni kullanıcı için boş egzersiz listesi ile başla
          const initialData = {
            exercises: [],
          };
          await setDoc(userDocRef, initialData);
          setExercises([]);
          lastExercisesState.current = [];
          isInitialLoad.current = false;
          isDataLoading.current = false;
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error("Veri yükleme hatası:", error);
        }
        isDataLoading.current = false;
      }
    };
    loadUserData();
  }, [user]);

  // Egzersiz Güncelleme - Korumalı
  useEffect(() => {
    if (!user || isInitialLoad.current || isDataLoading.current) return;
    
    // Sadece gerçek değişiklik varsa güncelle
    const hasRealChange = JSON.stringify(exercises) !== JSON.stringify(lastExercisesState.current);
    const isEmptyArray = Array.isArray(exercises) && exercises.length === 0;
    const wasEmptyArray = Array.isArray(lastExercisesState.current) && lastExercisesState.current.length === 0;
    
    // Boş diziye geçiş sadece gerçekten silme işlemi ise yapılsın
    if (hasRealChange && !(isEmptyArray && !wasEmptyArray)) {
      const updateExercisesInFirestore = async () => {
        try {
          const userDocRef = doc(db, "users", user.uid);
          await updateDoc(userDocRef, { exercises });
          lastExercisesState.current = [...exercises];
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            console.error("Veri kaydetme hatası:", error);
          }
        }
      };
      updateExercisesInFirestore();
    }
  }, [exercises, user]);

  // Firebase Auth: Kullanıcı Oturumunu İzleme
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        if (!firebaseUser.emailVerified) {
          await firebaseUser.reload();
          const updatedUser = auth.currentUser;
          setUser(updatedUser?.emailVerified ? updatedUser : null);
        } else {
          setUser(firebaseUser);
        }
      } else {
        setUser(null);
      }
      setAuthChecked(true);
    });
    return () => unsubscribe();
  }, []);

  // Email Doğrulama Kontrolü
  useEffect(() => {
    if (user && !user.emailVerified) {
      const interval = setInterval(async () => {
        try {
          await user.reload();
          const updatedUser = auth.currentUser;
          if (updatedUser?.emailVerified) {
            setUser(updatedUser);
          }
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            console.error("Yenileme hatası:", error);
          }
        }
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Email Doğrulama Geri Sayımı
  useEffect(() => {
    const timer = setInterval(() => {
      const savedTime = parseInt(localStorage.getItem("lastEmailSent") || 0);
      const remaining = Math.max(0, 60000 - (Date.now() - savedTime));
      setRemainingTime(remaining);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Email Doğrulama Tekrar Gönderme
  const handleResendEmail = async () => {
    try {
      await sendEmailVerification(auth.currentUser);
      const now = Date.now();
      localStorage.setItem("lastEmailSent", now);
      setRemainingTime(60000);
    } catch (error) {
      toast.error("Gönderme hatası: " + error.message);
    }
  };

  // --- Avatar Menüsü & Profil Modal ---
  const [anchorEl, setAnchorEl] = useState(null);
  const [openProfileModal, setOpenProfileModal] = useState(false);
  const [openProfileCompletionModal, setOpenProfileCompletionModal] = useState(false);
  const [profileData, setProfileData] = useState({
    username: "",
    firstName: "",
    lastName: "",
    profileImage: "",
    height: "",
    weight: "",
    birthDate: "",
    gender: "",
  });
  const [showWelcome, setShowWelcome] = useState(false);

  // Profil bilgilerinin tamamlanıp tamamlanmadığını kontrol eden fonksiyon
  const isProfileComplete = (profile) => {
    return (
      profile.firstName &&
      profile.lastName &&
      profile.height &&
      profile.weight &&
      profile.birthDate &&
      profile.gender
    );
  };

  // Profil tamamlama pop-up'ını kontrol eden fonksiyon
  const checkAndShowProfileCompletion = async (profile) => {
    if (!isProfileComplete(profile)) {
      try {
        // Firestore'dan profil tamamlama durumunu kontrol et
        const userDocRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          const profileCompletionShown = data.profileCompletionShown;
          
          if (!profileCompletionShown) {
            setOpenProfileCompletionModal(true);
          }
        } else {
          // Kullanıcı dokümanı yoksa pop-up'ı göster
          setOpenProfileCompletionModal(true);
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error("Profil tamamlama durumu kontrol hatası:", error);
        }
        // Hata durumunda pop-up'ı göster
        setOpenProfileCompletionModal(true);
      }
    }
  };

  // Doğum günü animasyonu
  const [showBirthdayAnimation, setShowBirthdayAnimation] = useState(false);

  useEffect(() => {
    if (user && profileData.birthDate) {
      const today = new Date();
      const birthDate = new Date(profileData.birthDate);
      // Sadece gün ve ay kontrolü
      if (
        today.getMonth() === birthDate.getMonth() &&
        today.getDate() === birthDate.getDate()
      ) {
        // Aynı gün içinde birden fazla gösterimi engellemek için
        const storageKey = `birthdayShown_${user.uid}`;
        const lastShown = localStorage.getItem(storageKey);
        const todayStr = today.toDateString();
        if (lastShown !== todayStr) {
          setShowBirthdayAnimation(true);
          localStorage.setItem(storageKey, todayStr);
          // 10 saniye sonra animasyonu kapat
          setTimeout(() => setShowBirthdayAnimation(false), 10000);
        }
      }
    }
  }, [user, profileData.birthDate]);

  // Profil Verilerini Firestore'dan Yükleme
  useEffect(() => {
    if (user) {
      const fetchProfile = async () => {
        const userDocRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(userDocRef);
        let prof = {};
        if (docSnap.exists() && docSnap.data().profile) {
          prof = docSnap.data().profile;
          // Firestore'da timestamp veya ISO formatında saklanıyorsa, Date objesine çevirin.
          let birth;
          if (prof.birthDate?.toDate) {
            birth = prof.birthDate.toDate(); // 👈 Date objesi olarak sakla
            prof.birthDate = birth; // Formatlama yapma!
          } else if (prof.birthDate && prof.birthDate.includes("T")) {
            birth = new Date(prof.birthDate);
            prof.birthDate = format(birth, "yyyy-MM-dd");
          }
          // Yaş hesaplama ve profile ekleme:
          if (birth) {
            const age = computeAge(birth);
            prof.age = age;
            // İsteğe bağlı: Firestore'daki profilde age alanı yoksa güncelleyin
            await updateDoc(userDocRef, { profile: { ...prof, age } });
          }
          // Varsayılan değerler ve diğer alanlar:
          prof.gender = prof.gender || "";
          setProfileData(prof);
          
          // Profil tamamlama kontrolü
          await checkAndShowProfileCompletion(prof);
        } else {
          // Profil verisi yoksa, varsayılan olarak ayarlayın
          const defaultProfile = {
            username: user.email,
            firstName: "",
            lastName: "",
            profileImage: "",
            height: "",
            weight: "",
            birthDate: "",
            gender: "",
            age: null,
          };
          setProfileData(defaultProfile);
          
          // Profil tamamlama kontrolü
          await checkAndShowProfileCompletion(defaultProfile);
        }
      };

      fetchProfile();

      // Hoşgeldin ekranı gibi diğer işlemler...
      if (!localStorage.getItem("welcomeShown")) {
        setShowWelcome(true);
        localStorage.setItem("welcomeShown", "true");
        setTimeout(() => setShowWelcome(false), 3000);
      }
    }
  }, [user]);

  // Email Doğrulama Sonrası Hoşgeldin Ekranı
  useEffect(() => {
    if (user && user.emailVerified) {
      const welcomeAlreadyShown = localStorage.getItem("welcomeShown");
      if (!welcomeAlreadyShown) {
        setShowWelcome(true);
        localStorage.setItem("welcomeShown", "true");
        setTimeout(() => setShowWelcome(false), 3000);
      }
    }
  }, [user]);

  const handleAvatarClick = (event) => {
    setAnchorEl(event.currentTarget);
  };
  const handleMenuClose = () => {
    setAnchorEl(null);
  };
  const handleProfileOpen = () => {
    setOpenProfileModal(true);
    setAnchorEl(null);
  };
  const handleProfileClose = () => {
    setOpenProfileModal(false);
  };
  
  const handleProfileCompletionClose = async () => {
    setOpenProfileCompletionModal(false);
  };
  
  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileData((prev) => ({ ...prev, [name]: value }));
  };
  const handleAvatarSelect = (url) => {
    setProfileData((prev) => ({ ...prev, profileImage: url }));
  };

  const handleProfileSave = async () => {
    try {
      const userDocRef = doc(db, "users", user.uid);
      const profileToSave = { ...profileData };

      if (typeof profileToSave.birthDate === "string") {
        const [year, month, day] = profileToSave.birthDate.split("-");
        profileToSave.birthDate = new Date(year, month - 1, day);
      }

      // Yaşı hesapla ve profile ekle
      if (profileToSave.birthDate) {
        profileToSave.age = computeAge(profileToSave.birthDate);
      }

      // Profil eksiksizse profileCompletionShown: true olarak kaydet
      if (isProfileComplete(profileToSave)) {
        await updateDoc(userDocRef, {
          profile: profileToSave,
          profileCompletionShown: true
        });
        setOpenProfileCompletionModal(false);
      } else {
        await updateDoc(userDocRef, {
          profile: profileToSave
        });
      }

      toast.success("Profil başarıyla güncellendi");
      setOpenProfileModal(false);
    } catch (error) {
      toast.error("Güncelleme hatası: " + error.message);
    }
  };
  const handleSignOut = () => {
    auth.signOut();
    setUser(null);
    localStorage.removeItem("currentUser");
    localStorage.removeItem("welcomeShown");
    setAnchorEl(null);
  };

  if (!authChecked) return <div style={{ display: "none" }}></div>;

  return (
    <>
      {showBirthdayAnimation && <BirthdayCelebration />}
      {/* Mevcut kullanıcı kontrolü ve içerik render'ı */}
      {!user ? (
        <Box
          sx={{
            minHeight: "100vh",
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            "&::before": {
              content: '""',
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              background: `url(${background}) no-repeat center center`,
              backgroundSize: "cover",
              zIndex: -1,
            },
          }}
        >
          <GlowingContainer maxWidth="sm" sx={{ mt: 4 }} glowColor={activeGlow}>
            <Box
              sx={{
                p: 4,
                backdropFilter: "blur(10px)",
                borderRadius: "24px",
                background: "rgba(255, 255, 255, 0.1)",
              }}
            >
              <UserAuth
                isRegister={isRegister}
                setIsRegister={setIsRegister}
                loginData={loginData}
                setLoginData={setLoginData}
                setUser={setUser}
                errors={errors}
                setErrors={setErrors}
              />
            </Box>
            <ToastContainer />
          </GlowingContainer>
        </Box>
      ) : !user.emailVerified ? (
        <Box
          sx={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: `url(${background}) no-repeat center center`,
            backgroundSize: "cover",
          }}
        >
          <GlowingContainer maxWidth="sm" sx={{ mt: 4 }} glowColor="#00BCD4">
            <Paper
              sx={{
                p: 4,
                textAlign: "center",
                background: "rgba(255, 255, 255, 0.1)",
                backdropFilter: "blur(10px)",
                borderRadius: "24px",
                border: "1px solid rgba(33, 150, 243, 0.2)",
              }}
            >
              <Box sx={{ textAlign: "center" }}>
                <Box
                  component="h5"
                  sx={{
                    background:
                      "linear-gradient(45deg, #2196F3 30%, #3F51B5 90%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  Email Doğrulama
                </Box>
                <Box
                  component="p"
                  sx={{ mb: 3, color: "rgba(255, 255, 255, 0.9)" }}
                >
                  Lütfen email adresinize gönderilen doğrulama linkine tıklayın.
                </Box>
                <AnimatedButton
                  onClick={handleResendEmail}
                  disabled={remainingTime > 0}
                >
                  {remainingTime > 0
                    ? `${Math.ceil(
                        remainingTime / 1000
                      )} saniye sonra tekrar deneyin`
                    : "Doğrulama Emailini Gönder"}
                </AnimatedButton>
              </Box>
              <AnimatedButton
                sx={{ mt: 2 }}
                variant="outlined"
                onClick={() => {
                  auth.signOut();
                  setUser(null);
                }}
              >
                Çıkış Yap
              </AnimatedButton>
            </Paper>
            <ToastContainer />
          </GlowingContainer>
        </Box>
      ) : showWelcome ? (
        <Box
          sx={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            background: `url(${background}) no-repeat center center`,
            backgroundSize: "cover",
          }}
        >
          <Lottie
            animationData={welcomeAnimation}
            style={{ width: 300, height: 300 }}
          />
          <Typography variant="h4" sx={{ color: "#fff", mt: 2 }}>
            Hoşgeldin, {profileData.firstName || profileData.username}!
          </Typography>
        </Box>
      ) : (
        <Box
          sx={{
            minHeight: "100vh",
            background:
              "linear-gradient(135deg, #1a2a6c 0%, #2196F3 50%, #3F51B5 100%)",
            transition: "background 0.5s ease",
          }}
        >
          <div className="app-container">
            <AppBar
              position="static"
              sx={{
                background:
                  "linear-gradient(90deg, #2196F3 0%, #00BCD4 50%, #3F51B5 100%)",
                boxShadow: "0 4px 20px rgba(33, 150, 243, 0.25)",
                position: "relative",
                overflow: "hidden",
                "&::after": {
                  content: '""',
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: "3px",
                  background: "rgba(255, 255, 255, 0.1)",
                },
                transition: "all 0.3s ease",
                "&:hover": {
                  boxShadow: "0 6px 25px rgba(33, 150, 243, 0.35)",
                },
              }}
            >
              <Toolbar
                sx={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: { xs: 1, sm: 0 },
                  py: { xs: 1, sm: 1.5 },
                  px: { xs: 2, sm: 4 },
                }}
              >
                <Box
                  sx={{
                    transition: "all 0.3s ease",
                    "&:hover": { transform: "translateX(5px)" },
                  }}
                >
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 600,
                      letterSpacing: "0.5px",
                      color: "rgba(255, 255, 255, 0.95)",
                      textShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                      fontSize: { xs: "0.8rem", sm: "1rem" },
                    }}
                  >
                    {format(currentTime, "dd MMMM yyyy", { locale: tr })}
                  </Typography>
                </Box>

                <Box
                  sx={{
                    background: "rgba(255, 255, 255, 0.1)",
                    backdropFilter: "blur(8px)",
                    borderRadius: 3,
                    padding: { xs: "4px 8px", sm: "8px 16px" },
                    mr: { xs: "65px" },
                    transition: "all 0.3s ease",
                    "&:hover": {
                      background: "rgba(255, 255, 255, 0.15)",
                      transform: "translateY(-2px)",
                    },
                  }}
                >
                  <WeatherWidget />
                </Box>

                <Avatar
                  src={profileData.profileImage || ""}
                  onClick={handleAvatarClick}
                  sx={{
                    cursor: "pointer",
                    width: { xs: 30, sm: 40 },
                    height: { xs: 30, sm: 40 },
                  }}
                />
                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={handleMenuClose}
                >
                  <MenuItem onClick={handleProfileOpen}>Profil</MenuItem>
                  <MenuItem onClick={handleNotificationSettingsOpen}>
                    Bildirim Ayarları
                  </MenuItem>
                  <MenuItem onClick={handleSignOut}>Çıkış Yap</MenuItem>
                </Menu>
              </Toolbar>
            </AppBar>

            {/* Profil Dialog */}
            <Dialog
              open={openProfileModal}
              onClose={handleProfileClose}
              fullWidth
              maxWidth="md"
              sx={{
                "& .MuiPaper-root": {
                  background:
                    "linear-gradient(145deg, #f0f8ff 0%, #e6f7ff 100%)",
                  borderRadius: "20px",
                  boxShadow: "0 8px 32px rgba(33, 150, 243, 0.2)",
                },
              }}
            >
              <DialogTitle
                sx={{
                  background:
                    "linear-gradient(45deg, #2196F3 30%, #3F51B5 90%)",
                  color: "white",
                  fontWeight: "bold",
                  borderRadius: "20px 20px 0 0",
                  py: 3,
                  textAlign: "center",
                }}
              >
                Profil Düzenleme
              </DialogTitle>

              <DialogContent sx={{ pt: 3 }}>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                    gap: 3,
                    my: 2,
                  }}
                >
                  <TextField
                    label="Kullanıcı Adı"
                    name="username"
                    fullWidth
                    value={profileData.username || ""}
                    onChange={handleProfileChange}
                    variant="outlined"
                    sx={{ background: "rgba(255,255,255,0.9)" }}
                    inputProps={{ readOnly: true }}
                  />
                  <FormControl
                    fullWidth
                    sx={{ background: "rgba(255,255,255,0.9)" }}
                  >
                    <InputLabel id="gender-label">Cinsiyet</InputLabel>
                    <Select
                      labelId="gender-label"
                      name="gender"
                      value={profileData.gender}
                      onChange={handleProfileChange}
                    >
                      <MenuItem value="male">Erkek</MenuItem>
                      <MenuItem value="female">Kadın</MenuItem>
                    </Select>
                  </FormControl>
                  <TextField
                    label="İsim"
                    name="firstName"
                    fullWidth
                    value={profileData.firstName || ""}
                    onChange={handleProfileChange}
                    variant="outlined"
                    sx={{ background: "rgba(255,255,255,0.9)" }}
                  />
                  <TextField
                    label="Soyisim"
                    name="lastName"
                    fullWidth
                    value={profileData.lastName || ""}
                    onChange={handleProfileChange}
                    variant="outlined"
                    sx={{ background: "rgba(255,255,255,0.9)" }}
                  />
                  <TextField
                    label="Doğum Tarihi"
                    name="birthDate"
                    type="date"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    value={
                      profileData.birthDate
                        ? format(profileData.birthDate, "yyyy-MM-dd")
                        : ""
                    }
                    onChange={handleProfileChange}
                    variant="outlined"
                    sx={{ background: "rgba(255,255,255,0.9)" }}
                  />
                  <TextField
                    label="Boy (cm)"
                    name="height"
                    type="number"
                    fullWidth
                    value={profileData.height || ""}
                    onChange={handleProfileChange}
                    variant="outlined"
                    sx={{ background: "rgba(255,255,255,0.9)" }}
                    inputProps={{ min: 0, max: 300 }}
                  />
                  <TextField
                    label="Kilo (kg)"
                    name="weight"
                    type="number"
                    fullWidth
                    value={profileData.weight || ""}
                    onChange={handleProfileChange}
                    variant="outlined"
                    sx={{ background: "rgba(255,255,255,0.9)" }}
                    inputProps={{ min: 0, max: 500 }}
                  />
                </Box>

                <Typography
                  variant="h6"
                  sx={{ mt: 2, mb: 1, color: "#2196F3" }}
                >
                  Avatar Seçimi
                </Typography>

                <Box
                  sx={{
                    display: "flex",
                    gap: 2,
                    overflowX: "auto",
                    pb: 2,
                    "&::-webkit-scrollbar": {
                      height: "6px",
                    },
                    "&::-webkit-scrollbar-thumb": {
                      background: "#2196F3",
                      borderRadius: "4px",
                    },
                  }}
                >
                  {availableAvatars?.map((url) => (
                    <Avatar
                      key={url}
                      src={url}
                      alt="Profil avatarı"
                      sx={{
                        cursor: "pointer",
                        width: 80,
                        height: 80,
                        border:
                          profileData.profileImage === url
                            ? "3px solid #2196F3"
                            : "2px solid #e0e0e0",
                        transition: "all 0.3s ease",
                        "&:hover": {
                          transform: "scale(1.1)",
                          boxShadow: "0 4px 15px rgba(33, 150, 243, 0.3)",
                        },
                      }}
                      onClick={() => handleAvatarSelect(url)}
                    />
                  ))}
                </Box>

                <Button
                  onClick={() => handlePasswordReset(user?.email)}
                  sx={{
                    mt: 2,
                    background:
                      "linear-gradient(45deg, #2196F3 30%, #3F51B5 90%)",
                    color: "white",
                    "&:hover": {
                      transform: "scale(1.02)",
                      boxShadow: "0 3px 10px rgba(33, 150, 243, 0.5)",
                    },
                  }}
                >
                  Şifre Sıfırlama Maili Gönder
                </Button>
              </DialogContent>

              <DialogActions
                sx={{
                  px: 3,
                  py: 2,
                  background: "rgba(255,255,255,0.9)",
                  borderRadius: "0 0 20px 20px",
                }}
              >
                <Button
                  onClick={handleProfileClose}
                  sx={{
                    color: "#2196F3",
                    border: "2px solid #2196F3",
                    "&:hover": { background: "#2196F322" },
                  }}
                >
                  İptal
                </Button>
                <Button
                  onClick={handleProfileSave}
                  sx={{
                    background:
                      "linear-gradient(45deg, #2196F3 30%, #3F51B5 90%)",
                    color: "white",
                    ml: 1,
                    "&:hover": {
                      boxShadow: "0 3px 10px rgba(33, 150, 243, 0.5)",
                    },
                  }}
                >
                  Değişiklikleri Kaydet
                </Button>
              </DialogActions>
            </Dialog>
            {/* Bildirim Ayarları Dialog */}
            <NotificationSettingsDialog
              open={openNotificationSettings}
              onClose={handleNotificationSettingsClose}
              user={user}
              onSave={(window) => {
                if (process.env.NODE_ENV === 'development') {
                  console.log(
                    "NotificationSettingsDialog onSave callback çağrıldı, window:",
                    window
                  );
                }
                return handleSaveNotificationWindow(user, supplements, window)
                  .then(() => {
                    if (process.env.NODE_ENV === 'development') {
                      console.log("handleSaveNotificationWindow tamamlandı");
                    }
                  })
                  .catch((error) => {
                    if (process.env.NODE_ENV === 'development') {
                      console.error("handleSaveNotificationWindow hatası:", error);
                    }
                  });
              }}
            />

            {/* Profil Tamamlama Dialog */}
            <Dialog
              open={openProfileCompletionModal}
              onClose={handleProfileCompletionClose}
              fullWidth
              maxWidth="md"
              disableEscapeKeyDown
              disableBackdropClick
              sx={{
                "& .MuiPaper-root": {
                  background:
                    "linear-gradient(145deg, #fff3e0 0%, #ffe0b2 100%)",
                  borderRadius: "20px",
                  boxShadow: "0 8px 32px rgba(255, 152, 0, 0.3)",
                },
              }}
            >
              <DialogTitle
                sx={{
                  background:
                    "linear-gradient(45deg, #FF9800 30%, #F57C00 90%)",
                  color: "white",
                  fontWeight: "bold",
                  borderRadius: "20px 20px 0 0",
                  py: 3,
                  textAlign: "center",
                }}
              >
                <Box display="flex" alignItems="center" justifyContent="center" gap={2}>
                  <PersonIcon sx={{ fontSize: 40 }} />
                  <Typography variant="h5">
                    Profil Bilgilerinizi Tamamlayın
                  </Typography>
                </Box>
              </DialogTitle>

              <DialogContent sx={{ pt: 3 }}>
                <Box sx={{ mb: 3 }}>
                  <Typography variant="body1" sx={{ color: "#d84315", mb: 2 }}>
                    🎯 Daha iyi bir deneyim için lütfen profil bilgilerinizi tamamlayın.
                  </Typography>
                  <Typography variant="body2" sx={{ color: "#666", mb: 2 }}>
                    Bu bilgiler sağlık önerilerinizi kişiselleştirmek ve size daha iyi hizmet vermek için kullanılır.
                  </Typography>
                </Box>

                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                    gap: 3,
                    my: 2,
                  }}
                >
                  <TextField
                    label="İsim *"
                    name="firstName"
                    fullWidth
                    value={profileData.firstName || ""}
                    onChange={handleProfileChange}
                    variant="outlined"
                    required
                    sx={{ background: "rgba(255,255,255,0.9)" }}
                  />
                  <TextField
                    label="Soyisim *"
                    name="lastName"
                    fullWidth
                    value={profileData.lastName || ""}
                    onChange={handleProfileChange}
                    variant="outlined"
                    required
                    sx={{ background: "rgba(255,255,255,0.9)" }}
                  />
                  <FormControl
                    fullWidth
                    required
                    sx={{ background: "rgba(255,255,255,0.9)" }}
                  >
                    <InputLabel id="gender-label">Cinsiyet *</InputLabel>
                    <Select
                      labelId="gender-label"
                      name="gender"
                      value={profileData.gender}
                      onChange={handleProfileChange}
                    >
                      <MenuItem value="male">Erkek</MenuItem>
                      <MenuItem value="female">Kadın</MenuItem>
                    </Select>
                  </FormControl>
                  <TextField
                    label="Doğum Tarihi *"
                    name="birthDate"
                    type="date"
                    fullWidth
                    required
                    InputLabelProps={{ shrink: true }}
                    value={
                      profileData.birthDate
                        ? format(profileData.birthDate, "yyyy-MM-dd")
                        : ""
                    }
                    onChange={handleProfileChange}
                    variant="outlined"
                    sx={{ background: "rgba(255,255,255,0.9)" }}
                  />
                  <TextField
                    label="Boy (cm) *"
                    name="height"
                    type="number"
                    fullWidth
                    required
                    value={profileData.height || ""}
                    onChange={handleProfileChange}
                    variant="outlined"
                    sx={{ background: "rgba(255,255,255,0.9)" }}
                    inputProps={{ min: 0, max: 300 }}
                  />
                  <TextField
                    label="Kilo (kg) *"
                    name="weight"
                    type="number"
                    fullWidth
                    required
                    value={profileData.weight || ""}
                    onChange={handleProfileChange}
                    variant="outlined"
                    sx={{ background: "rgba(255,255,255,0.9)" }}
                    inputProps={{ min: 0, max: 500 }}
                  />
                </Box>

                <Typography
                  variant="h6"
                  sx={{ mt: 2, mb: 1, color: "#FF9800" }}
                >
                  Avatar Seçimi
                </Typography>

                <Box
                  sx={{
                    display: "flex",
                    gap: 2,
                    overflowX: "auto",
                    pb: 2,
                    "&::-webkit-scrollbar": {
                      height: "6px",
                    },
                    "&::-webkit-scrollbar-thumb": {
                      background: "#FF9800",
                      borderRadius: "4px",
                    },
                  }}
                >
                  {availableAvatars?.map((url) => (
                    <Avatar
                      key={url}
                      src={url}
                      alt="Profil avatarı"
                      sx={{
                        cursor: "pointer",
                        width: 80,
                        height: 80,
                        border:
                          profileData.profileImage === url
                            ? "3px solid #FF9800"
                            : "2px solid #e0e0e0",
                        transition: "all 0.3s ease",
                        "&:hover": {
                          transform: "scale(1.1)",
                          boxShadow: "0 4px 15px rgba(255, 152, 0, 0.3)",
                        },
                      }}
                      onClick={() => handleAvatarSelect(url)}
                    />
                  ))}
                </Box>
              </DialogContent>

              <DialogActions
                sx={{
                  px: 3,
                  py: 2,
                  background: "rgba(255,255,255,0.9)",
                  borderRadius: "0 0 20px 20px",
                }}
              >
                <Button
                  onClick={handleProfileCompletionClose}
                  sx={{
                    color: "#FF9800",
                    border: "2px solid #FF9800",
                    "&:hover": { background: "#FF980022" },
                  }}
                >
                  Daha Sonra
                </Button>
                <Button
                  onClick={handleProfileSave}
                  disabled={!isProfileComplete(profileData)}
                  sx={{
                    background:
                      "linear-gradient(45deg, #FF9800 30%, #F57C00 90%)",
                    color: "white",
                    ml: 1,
                    "&:hover": {
                      boxShadow: "0 3px 10px rgba(255, 152, 0, 0.5)",
                    },
                    "&:disabled": {
                      background: "#ccc",
                      color: "#666",
                    },
                  }}
                >
                  Profili Tamamla
                </Button>
              </DialogActions>
            </Dialog>

            {/* İçerik Alanı */}
            {isPWA ? (
              // --- PWA MODE: BOTTOM NAVIGATION ---
              <React.Fragment>
                {/* İçerik alanına ekstra alt boşluk eklenerek alt navigasyonun üzerine taşmaması sağlandı */}
                <Box sx={{ pb: 15, mt: 2 }}>
                  {activeTab === 0 && <DailyRoutine user={user} />}
                  {activeTab === 1 && <WellnessTracker user={user} />}
                  {activeTab === 2 && <HealthDashboard user={user} />}
                  {activeTab === 3 && (
                    <Exercises
                      exercises={exercises}
                      setExercises={setExercises}
                      handleExerciseSubmit={handleExerciseSubmit}
                      editingExercise={editingExercise}
                      setEditingExercise={setEditingExercise}
                    />
                  )}
                  {activeTab === 4 && <CalendarComponent user={user} />}
                </Box>

                <BottomNavigation
                  showLabels
                  value={activeTab}
                  onChange={(event, newValue) => handleTabChange(newValue)}
                  sx={{
                    position: "fixed",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: "64px",
                    pb: "env(safe-area-inset-bottom, 0px)",
                    zIndex: 1300,
                    borderTop: "1px solid #ccc",
                    background:
                      "linear-gradient(90deg, #2196F3 0%, #00BCD4 50%, #3F51B5 100%)",
                  }}
                >
                  <BottomNavigationAction
                    sx={{
                      flex: 1,
                      minWidth: 0,
                      "&.Mui-selected": {
                        backgroundColor: "transparent",
                        borderTop: "3px solid white",
                      },
                    }}
                    label="Rutin"
                    icon={<HomeIcon sx={{ color: "white", mt: "-4px" }} />}
                  />
                  <BottomNavigationAction
                    sx={{
                      flex: 1,
                      minWidth: 0,
                      "&.Mui-selected": {
                        backgroundColor: "transparent",
                        borderTop: "3px solid white",
                      },
                    }}
                    label="Yaşam"
                    icon={<FavoriteIcon sx={{ color: "white", mt: "-4px" }} />}
                  />
                  <BottomNavigationAction
                    sx={{
                      flex: 1,
                      minWidth: 0,
                      "&.Mui-selected": {
                        backgroundColor: "transparent",
                        borderTop: "3px solid white",
                      },
                    }}
                    label="Sağlık"
                    icon={<DashboardIcon sx={{ color: "white", mt: "-4px" }} />}
                  />
                  <BottomNavigationAction
                    sx={{
                      flex: 1,
                      minWidth: 0,
                      "&.Mui-selected": {
                        backgroundColor: "transparent",
                        borderTop: "3px solid white",
                      },
                    }}
                    label="AI Egzersiz"
                    icon={
                      <FitnessCenterIcon sx={{ color: "white", mt: "-4px" }} />
                    }
                  />
                  <BottomNavigationAction
                    sx={{
                      flex: 1,
                      minWidth: 0,
                      "&.Mui-selected": {
                        backgroundColor: "transparent",
                        borderTop: "3px solid white",
                      },
                    }}
                    label="Takvim"
                    icon={
                      <CalendarMonthIcon sx={{ color: "white", mt: "-4px" }} />
                    }
                  />
                </BottomNavigation>
              </React.Fragment>
            ) : (
              // --- PWA dışı: TABS ---
              <React.Fragment>
                <Tabs
                  value={activeTab}
                  onChange={(event, newTab) => handleTabChange(newTab)}
                  variant="scrollable"
                  scrollButtons="auto"
                  textColor="primary"
                  indicatorColor="primary"
                  sx={{
                    height: "60px",
                    minHeight: "60px",
                    justifyContent: "center",
                    background:
                      "linear-gradient(135deg, #f0f8ff 0%, #e6f7ff 100%)",
                    position: "relative",
                    boxShadow: "0 4px 20px rgba(33, 150, 243, 0.1)",
                    "&::after": {
                      content: '""',
                      position: "absolute",
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: "1px",
                      background:
                        "linear-gradient(90deg, #2196F3 0%, #00BCD4 50%, #3F51B5 100%)",
                      opacity: 0.7,
                    },
                    "& .MuiTabs-flexContainer": {
                      justifyContent: { xs: "flex-start", md: "center" },
                      gap: 1,
                    },
                    "& .MuiTabs-indicator": {
                      background:
                        "linear-gradient(90deg, #2196F3 0%, #00BCD4 50%, #3F51B5 100%)",
                      height: 3,
                      borderRadius: "3px 3px 0 0",
                      boxShadow: "0 -2px 8px rgba(33, 150, 243, 0.2)",
                    },
                    "& .MuiTab-root": {
                      textTransform: "none",
                      fontWeight: 700,
                      fontSize: { xs: "0.8rem", md: "0.95rem" },
                      margin: "0 5px",
                      minWidth: "auto",
                      padding: "10px 20px",
                      borderRadius: "8px 8px 0 0",
                      transition: "all 0.3s ease",
                      color: "rgba(0, 0, 0, 0.6)",
                      "&:hover": {
                        backgroundColor: "rgba(33, 150, 243, 0.08)",
                        transform: "translateY(-2px)",
                        color: "#2196F3",
                      },
                      "&.Mui-selected": {
                        color: "#2196F3",
                        background: "rgba(33, 150, 243, 0.08)",
                        fontWeight: 700,
                      },
                    },
                    "& .MuiTabScrollButton-root": {
                      width: 48,
                      transition: "all 0.3s ease",
                      "&.Mui-disabled": { opacity: 0 },
                      "&:hover": {
                        backgroundColor: "rgba(33, 150, 243, 0.08)",
                      },
                      "& .MuiSvgIcon-root": {
                        fontSize: "1.5rem",
                        color: "#2196F3",
                      },
                    },
                  }}
                >
                  <Tab
                    icon={<HomeIcon sx={{ fontSize: "1.0rem" }} />}
                    label="Rutin"
                  />
                  <Tab
                    icon={<FavoriteIcon sx={{ fontSize: "1.0rem" }} />}
                    label="Yaşam"
                  />
                  <Tab
                    icon={<DashboardIcon sx={{ fontSize: "1.0rem" }} />}
                    label="Sağlık"
                  />
                  <Tab
                    icon={<FitnessCenterIcon sx={{ fontSize: "1.0rem" }} />}
                    label="AI Egzersiz"
                  />
                  <Tab
                    icon={<CalendarMonthIcon sx={{ fontSize: "1.0rem" }} />}
                    label="Takvim"
                  />
                </Tabs>

                {activeTab === 0 && <DailyRoutine user={user} />}
                {activeTab === 1 && <WellnessTracker user={user} />}
                {activeTab === 2 && <HealthDashboard user={user} />}
                {activeTab === 3 && (
                  <Exercises
                    exercises={exercises}
                    setExercises={setExercises}
                    handleExerciseSubmit={handleExerciseSubmit}
                    editingExercise={editingExercise}
                    setEditingExercise={setEditingExercise}
                  />
                )}
                {activeTab === 4 && <CalendarComponent user={user} />}
              </React.Fragment>
            )}

            {/* Footer yalnızca PWA dışı modda gösterilsin */}
            {!isPWA && (
              <Box
                component="footer"
                sx={{
                  position: "relative",
                  overflow: "hidden",
                  background: "linear-gradient(135deg, #1a2a6c 0%, #2196F3 50%, #3F51B5 100%)",
                  py: 3,
                  px: 2,
                  "&::before": {
                    content: '""',
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: "3px",
                    background: "linear-gradient(90deg, #2196F3 0%, #00BCD4 50%, #3F51B5 100%)",
                    opacity: 0.7,
                  },
                }}
              >
                {/* Animated background particles */}
                {[...Array(8)].map((_, i) => (
                  <motion.div
                    key={i}
                    style={{
                      position: "absolute",
                      width: "6px",
                      height: "6px",
                      background: "linear-gradient(45deg, #64B5F6, #E1BEE7)",
                      borderRadius: "50%",
                      opacity: 0.3,
                      zIndex: 0,
                    }}
                    initial={{
                      x: Math.random() * window.innerWidth,
                      y: Math.random() * window.innerHeight,
                      scale: Math.random() * 0.7 + 0.3,
                    }}
                    animate={{
                      y: [0, Math.random() * window.innerHeight],
                      opacity: [0.2, 0.5, 0.2],
                    }}
                    transition={{
                      duration: Math.random() * 8 + 6,
                      repeat: Infinity,
                      ease: "linear",
                      delay: Math.random() * 2,
                    }}
                  />
                ))}

                <Container maxWidth="lg" sx={{ position: "relative", zIndex: 1 }}>
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 2,
                    }}
                  >
                    {/* Copyright ve Made with love */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.2 }}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "12px",
                      }}
                    >
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.3, type: "spring", stiffness: 100 }}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <motion.span
                          initial={{ opacity: 0, scale: 0.8 }}
                          whileInView={{ opacity: 1, scale: 1 }}
                          viewport={{ once: true }}
                          transition={{ delay: 0.4 }}
                          style={{
                            fontSize: "14px",
                            color: "rgba(255, 255, 255, 0.7)",
                          }}
                        >
                          © {new Date().getFullYear()}
                        </motion.span>

                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          whileInView={{ opacity: 1, scale: 1 }}
                          viewport={{ once: true }}
                          transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            color: "rgba(255, 255, 255, 0.8)",
                            background: "rgba(255, 255, 255, 0.1)",
                            backdropFilter: "blur(10px)",
                            padding: "8px 20px",
                            borderRadius: "25px",
                            border: "1px solid rgba(255, 255, 255, 0.2)",
                            transition: "all 0.3s ease",
                            cursor: "pointer",
                          }}
                          whileHover={{
                            border: "1px solid rgba(255, 255, 255, 0.4)",
                            boxShadow: "0 4px 15px rgba(255, 255, 255, 0.1)",
                          }}
                        >
                          <span style={{ fontSize: "12px", fontWeight: 500 }}>Made with</span>
                          <motion.span
                            animate={{
                              scale: [1, 1.2, 1],
                              rotate: [0, 10, -10, 0]
                            }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                              repeatType: "reverse"
                            }}
                            style={{
                              color: "#ff6b6b",
                              fontSize: "14px",
                            }}
                          >
                            ❤
                          </motion.span>
                          <span 
                            style={{ 
                              fontSize: "12px", 
                              fontWeight: 500,
                              background: "linear-gradient(45deg, #64B5F6, #E1BEE7)",
                              WebkitBackgroundClip: "text",
                              WebkitTextFillColor: "transparent",
                              backgroundClip: "text",
                            }}
                          >
                            by Mert Pehlivan
                          </span>
                        </motion.div>

                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: 0.6 }}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            fontSize: "14px",
                            color: "rgba(255, 255, 255, 0.7)",
                          }}
                        >
                          <span>StayHealthyWith.me</span>
                          <motion.a
                            href="mailto:s.mertpehlivan@proton.me"
                            whileHover={{ scale: 1.2, rotate: 5 }}
                            style={{
                              color: "rgba(255, 255, 255, 0.7)",
                              fontSize: "16px",
                              transition: "color 0.3s ease",
                              cursor: "pointer",
                            }}
                            onMouseEnter={(e) => e.target.style.color = "rgba(255, 255, 255, 1)"}
                            onMouseLeave={(e) => e.target.style.color = "rgba(255, 255, 255, 0.7)"}
                          >
                            <FaEnvelope />
                          </motion.a>
                        </motion.div>

                        <motion.span
                          initial={{ opacity: 0, y: 10 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: 0.7 }}
                          style={{
                            fontSize: "12px",
                            color: "rgba(255, 255, 255, 0.6)",
                          }}
                        >
                          All rights reserved
                        </motion.span>
                      </motion.div>
                    </motion.div>
                  </Box>
                </Container>
              </Box>
            )}

            <ToastContainer position="bottom-right" autoClose={3000} />
            <ToastContainer
              position="top-right"
              autoClose={3000}
              hideProgressBar={false}
              newestOnTop={false}
              closeOnClick
              rtl={false}
              pauseOnFocusLoss
              draggable
              pauseOnHover
            />
          </div>
        </Box>
      )}
      <ToastContainer position="bottom-right" autoClose={3000} />
    </>
  );
}
export default App;
