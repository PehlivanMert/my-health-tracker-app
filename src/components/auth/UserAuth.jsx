import React, { useState, useEffect } from "react";
import {
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  useTheme,
  styled,
  keyframes,
  CircularProgress,
  IconButton,
  InputAdornment,
} from "@mui/material";
import { motion, AnimatePresence } from "framer-motion";
import {
  Visibility,
  VisibilityOff,
  Email,
  Lock,
  Person,
  ArrowForward,
  ArrowBack,
} from "@mui/icons-material";
import {
  handleLogin,
  handleRegister,
  handlePasswordReset,
} from "./AuthHandlers";

// iOS kontrol fonksiyonu
const isIOS = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

// =====================
// Cam Efekti Kart (Web & Android)
// =====================
const GlassmorphismCard = styled(motion.div, {
  shouldForwardProp: (prop) => prop !== "$glowColor" && prop !== "isIOS",
})(({ theme, $glowColor = "#2196F3" }) => ({
  position: "relative",
  padding: theme.spacing(4),
  width: "100%",
  maxWidth: 450,
  borderRadius: "24px",
  background: "rgba(255, 255, 255, 0.15)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  border: "1px solid rgba(255, 255, 255, 0.2)",
  boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
  overflow: "hidden",
  backgroundClip: "padding-box",
  willChange: "backdrop-filter",
  transform: "translateZ(0)",
  transition: "background 0.4s ease, all 0.4s ease",
  "&:hover": {
    background: "rgba(255, 255, 255, 0.25)",
  },
  [theme.breakpoints.down("sm")]: {
    background: "rgba(255, 255, 255, 0.2)",
    "&:hover": {
      background: "rgba(255, 255, 255, 0.3)",
    },
  },
  "&::before": {
    content: '""',
    position: "absolute",
    top: "-50%",
    left: "-50%",
    width: "200%",
    height: "200%",
    background: `radial-gradient(circle, ${$glowColor}33 0%, transparent 50%)`,
    opacity: 0,
    transition: "opacity 0.6s ease",
    pointerEvents: "none",
    zIndex: -1,
  },
  "&:hover::before": {
    opacity: 1,
  },
  "&::after": {
    content: '""',
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "5px",
    background: `linear-gradient(90deg, ${$glowColor} 0%, ${$glowColor}88 50%, ${$glowColor} 100%)`,
  },
}));

// =====================
// iOS İçin Alternatif Kart Tasarımı
// (Backdrop-filter ve cam efekti yerine, uyumlu bir lineer gradyan kullanılıyor)
// =====================
const IOSCard = styled(motion.div, {
  shouldForwardProp: (prop) => prop !== "$glowColor",
})(({ theme, $glowColor = "#2196F3" }) => ({
  position: "relative",
  padding: theme.spacing(4),
  width: "100%",
  maxWidth: 450,
  borderRadius: "24px",
  background: `linear-gradient(135deg, ${$glowColor}55, ${$glowColor}11)`,
  border: "1px solid rgba(255, 255, 255, 0.2)",
  boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
  overflow: "hidden",
  backgroundClip: "padding-box",
  transition: "background 0.4s ease, all 0.4s ease",
  "&:hover": {
    background: `linear-gradient(135deg, ${$glowColor}66, ${$glowColor}22)`,
  },
  "&::after": {
    content: '""',
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "5px",
    background: `linear-gradient(90deg, ${$glowColor} 0%, ${$glowColor}88 50%, ${$glowColor} 100%)`,
  },
}));

// =====================
// Ortak Bileşenler (GlowingTextField, AnimatedButton, AnimatedLink)
// =====================
const GlowingTextField = styled(TextField, {
  shouldForwardProp: (prop) => prop !== "$focusColor",
})(({ theme, $focusColor = "#2196F3" }) => ({
  marginBottom: theme.spacing(3),
  "& .MuiOutlinedInput-root": {
    borderRadius: "16px",
    // iOS için arka plan rengini değiştirmedik, çünkü alanın tutarlılığı önemli
    background: "rgba(255, 255, 255, 0.09)",
    backdropFilter: "blur(5px)",
    WebkitBackdropFilter: "blur(5px)",
    color: "#ffffff",
    transition: "all 0.3s ease",
    "& fieldset": {
      borderColor: "rgba(255, 255, 255, 0.15)",
      transition: "all 0.3s ease",
    },
    "&:hover fieldset": {
      borderColor: "rgba(255, 255, 255, 0.3)",
    },
    "&.Mui-focused": {
      boxShadow: `0 0 12px ${$focusColor}66`,
    },
    "&.Mui-focused fieldset": {
      borderColor: $focusColor,
    },
    "& input:-webkit-autofill": {
      WebkitBoxShadow: `0 0 0 100px rgba(255, 255, 255, 0.09) inset`,
      WebkitTextFillColor: "#ffffff",
      transition: "background-color 5000s ease-in-out 0s",
    },
  },
  "& .MuiInputLabel-root": {
    color: "rgba(255, 255, 255, 0.7)",
  },
  "& .MuiInputLabel-root.Mui-focused": {
    color: $focusColor,
  },
  "& .MuiInputAdornment-root": {
    color: "rgba(255, 255, 255, 0.5)",
  },
}));

const AnimatedButton = styled(motion.button, {
  shouldForwardProp: (prop) =>
    prop !== "$gradientStart" && prop !== "$gradientEnd",
})(({ theme, $gradientStart = "#2196F3", $gradientEnd = "#00BCD4" }) => ({
  width: "100%",
  padding: "12px 24px",
  borderRadius: "16px",
  border: "none",
  background: `linear-gradient(45deg, ${$gradientStart} 30%, ${$gradientEnd} 90%)`,
  color: "white",
  fontSize: "1rem",
  fontWeight: 600,
  cursor: "pointer",
  outline: "none",
  position: "relative",
  overflow: "hidden",
  boxShadow: `0 4px 15px ${$gradientStart}44`,
  transition: "all 0.3s ease",
  "&:hover": {
    boxShadow: `0 6px 20px ${$gradientStart}66`,
  },
  "&:disabled": {
    opacity: 0.6,
    cursor: "not-allowed",
  },
  "&::before": {
    content: '""',
    position: "absolute",
    top: 0,
    left: "-100%",
    width: "100%",
    height: "100%",
    background: `linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)`,
    transition: "all 0.5s ease",
  },
  "&:hover::before": {
    left: "100%",
  },
}));

const AnimatedLink = styled(Button, {
  shouldForwardProp: (prop) => prop !== "$color",
})(({ theme, $color = "#2196F3" }) => ({
  color: "rgba(255, 255, 255, 0.8)",
  textTransform: "none",
  position: "relative",
  padding: "4px 8px",
  overflow: "hidden",
  background: "transparent",
  transition: "all 0.3s ease",
  "&::after": {
    content: '""',
    position: "absolute",
    bottom: 0,
    left: "50%",
    width: 0,
    height: "2px",
    background: $color,
    transition: "all 0.3s ease",
    transform: "translateX(-50%)",
  },
  "&:hover": {
    color: "#ffffff",
    background: "transparent",
    "&::after": {
      width: "80%",
    },
  },
}));

// Sayfa & Eleman Animasyon Varyantları
const pageVariants = {
  initial: { opacity: 0, y: 20 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -20 },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0.6, 0.05, 0.01, 0.9] },
  }),
};

const buttonVariants = {
  rest: { scale: 1 },
  hover: {
    scale: 1.05,
    transition: { duration: 0.3, type: "spring", stiffness: 400, damping: 10 },
  },
  tap: { scale: 0.95 },
};

// =====================
// UserAuth Bileşeni
// =====================
const UserAuth = ({ setUser }) => {
  const theme = useTheme();
  const [isRegister, setIsRegister] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [loginData, setLoginData] = useState({
    username: "",
    password: "",
    firstName: "",
    lastName: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [activeGlow, setActiveGlow] = useState("#2196F3");
  const [remainingTime, setRemainingTime] = useState(0);

  // Şifre sıfırlama butonunun zamanlayıcısı
  useEffect(() => {
    const savedTime = localStorage.getItem("lastEmailSent");
    if (savedTime) {
      const initialRemaining = Math.max(
        0,
        60000 - (Date.now() - parseInt(savedTime))
      );
      setRemainingTime(initialRemaining);
    }
  }, []);

  // Modlara göre glow rengi ayarı
  useEffect(() => {
    if (isResetting) {
      setActiveGlow("#9c27b0");
    } else if (isRegister) {
      setActiveGlow("#00bcd4");
    } else {
      setActiveGlow("#2196F3");
    }
  }, [isRegister, isResetting]);

  const validate = () => {
    const newErrors = {};

    if (!loginData.username || !loginData.username.includes("@")) {
      newErrors.username = "Geçerli bir e-posta adresi giriniz";
    }

    // Şifre sıfırlama modunda şifre kontrolü yapma
    if (!isResetting) {
      if (!loginData.password) {
        newErrors.password = "Şifre gereklidir";
      } else if (isRegister && loginData.password.length < 8) {
        newErrors.password = "Şifre en az 8 karakter olmalıdır";
      }
    }

    if (isRegister && loginData.password !== loginData.confirmPassword) {
      newErrors.confirmPassword = "Şifreler eşleşmiyor";
    }

    if (isRegister && !loginData.firstName) {
      newErrors.firstName = "İsim gereklidir";
    }

    if (isRegister && !loginData.lastName) {
      newErrors.lastName = "Soyisim gereklidir";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (process.env.NODE_ENV === 'development') {
      console.log("Form gönderildi, isResetting:", isResetting);
      console.log("Form verileri:", loginData);
    }

    if (!validate()) {
      if (process.env.NODE_ENV === 'development') {
        console.log("Form validasyonu başarısız");
      }
      return;
    }

    setIsLoading(true);

    try {
      if (isResetting) {
        if (process.env.NODE_ENV === 'development') {
          console.log("Şifre sıfırlama işlemi başlatılıyor...");
        }
        await handlePasswordReset(loginData.username);
        setIsResetting(false);
      } else if (isRegister) {
        await handleRegister(e, { loginData, setUser, setLoginData });
      } else {
        await handleLogin(e, { loginData, setUser, setLoginData });
      }
    } catch (error) {
      console.error("Auth error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = (mode) => {
    setLoginData({
      username: "",
      password: "",
      firstName: "",
      lastName: "",
      confirmPassword: "",
    });
    setErrors({});

    if (mode === "reset") {
      setIsResetting(true);
      setIsRegister(false);
    } else if (mode === "register") {
      setIsResetting(false);
      setIsRegister(true);
    } else {
      setIsResetting(false);
      setIsRegister(false);
    }
  };

  const isIOSDevice = isIOS();

  // Render edilecek kart bileşeni, platforma göre seçiliyor
  const ContainerCard = isIOSDevice ? IOSCard : GlassmorphismCard;

  return (
    <AnimatePresence mode="wait">
      <ContainerCard
        key={`${isRegister ? "register" : "login"}-${
          isResetting ? "reset" : "normal"
        }`}
        initial="initial"
        animate="in"
        exit="out"
        variants={pageVariants}
        transition={{ duration: 0.4 }}
        $glowColor={activeGlow}
      >
        <motion.div
          custom={0}
          initial="hidden"
          animate="visible"
          variants={itemVariants}
          style={{ textAlign: "center" }}
        >
          <motion.div
            whileHover={{ rotate: 5, scale: 1.1 }}
            transition={{ duration: 0.3 }}
          >
            <Typography
              variant="h3"
              component="h1"
              sx={{
                fontWeight: 700,
                background: `linear-gradient(90deg, ${activeGlow} 0%, #ffffff 50%, ${activeGlow} 100%)`,
                backgroundSize: "200% auto",
                color: "transparent",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                marginBottom: 3,
                animation: "shine 3s linear infinite",
                "@keyframes shine": {
                  "0%": { backgroundPosition: "0% center" },
                  "100%": { backgroundPosition: "200% center" },
                },
              }}
            >
              {isResetting
                ? "Şifre Sıfırlama"
                : isRegister
                ? "Yeni Hesap"
                : "Hoş Geldiniz"}
            </Typography>
          </motion.div>
          <Typography
            variant="body1"
            sx={{ color: "rgba(255, 255, 255, 0.7)", marginBottom: 4 }}
          >
            {isResetting
              ? "E-posta adresinizi girin"
              : isRegister
              ? "Bilgilerinizi doldurun"
              : "Hesabınıza giriş yapın"}
          </Typography>
        </motion.div>

        <form onSubmit={handleSubmit}>
          <Box sx={{ position: "relative" }}>
            <motion.div
              custom={1}
              initial="hidden"
              animate="visible"
              variants={itemVariants}
            >
              <GlowingTextField
                fullWidth
                label="E-posta"
                type="email"
                name="username"
                value={loginData.username}
                onChange={(e) =>
                  setLoginData({ ...loginData, username: e.target.value })
                }
                error={!!errors.username}
                helperText={errors.username}
                required
                $focusColor={activeGlow}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Email sx={{ color: "rgba(255, 255, 255, 0.5)" }} />
                    </InputAdornment>
                  ),
                }}
              />
            </motion.div>

            {!isResetting && (
              <>
                <motion.div
                  custom={2}
                  initial="hidden"
                  animate="visible"
                  variants={itemVariants}
                >
                  <GlowingTextField
                    fullWidth
                    label="Şifre"
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={loginData.password}
                    onChange={(e) =>
                      setLoginData({ ...loginData, password: e.target.value })
                    }
                    error={!!errors.password}
                    helperText={errors.password}
                    required
                    $focusColor={activeGlow}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Lock sx={{ color: "rgba(255, 255, 255, 0.5)" }} />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            aria-label="toggle password visibility"
                            onClick={() => setShowPassword(!showPassword)}
                            edge="end"
                            sx={{ color: "rgba(255, 255, 255, 0.5)" }}
                          >
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </motion.div>

                {isRegister && (
                  <>
                    <motion.div
                      custom={3}
                      initial="hidden"
                      animate="visible"
                      variants={itemVariants}
                    >
                      <GlowingTextField
                        fullWidth
                        label="Şifre Tekrar"
                        type={showPassword ? "text" : "password"}
                        name="confirmPassword"
                        value={loginData.confirmPassword}
                        onChange={(e) =>
                          setLoginData({
                            ...loginData,
                            confirmPassword: e.target.value,
                          })
                        }
                        error={!!errors.confirmPassword}
                        helperText={errors.confirmPassword}
                        required
                        $focusColor={activeGlow}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <Lock
                                sx={{ color: "rgba(255, 255, 255, 0.5)" }}
                              />
                            </InputAdornment>
                          ),
                        }}
                      />
                    </motion.div>

                    <motion.div
                      custom={4}
                      initial="hidden"
                      animate="visible"
                      variants={itemVariants}
                    >
                      <GlowingTextField
                        fullWidth
                        label="İsim"
                        name="firstName"
                        value={loginData.firstName}
                        onChange={(e) =>
                          setLoginData({
                            ...loginData,
                            firstName: e.target.value,
                          })
                        }
                        error={!!errors.firstName}
                        helperText={errors.firstName}
                        required
                        $focusColor={activeGlow}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <Person
                                sx={{ color: "rgba(255, 255, 255, 0.5)" }}
                              />
                            </InputAdornment>
                          ),
                        }}
                      />
                    </motion.div>

                    <motion.div
                      custom={5}
                      initial="hidden"
                      animate="visible"
                      variants={itemVariants}
                    >
                      <GlowingTextField
                        fullWidth
                        label="Soyisim"
                        name="lastName"
                        value={loginData.lastName}
                        onChange={(e) =>
                          setLoginData({
                            ...loginData,
                            lastName: e.target.value,
                          })
                        }
                        error={!!errors.lastName}
                        helperText={errors.lastName}
                        required
                        $focusColor={activeGlow}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <Person
                                sx={{ color: "rgba(255, 255, 255, 0.5)" }}
                              />
                            </InputAdornment>
                          ),
                        }}
                      />
                    </motion.div>
                  </>
                )}
              </>
            )}

            <motion.div
              custom={6}
              initial="hidden"
              animate="visible"
              variants={itemVariants}
              style={{ marginTop: theme.spacing(4) }}
            >
              <motion.div
                variants={buttonVariants}
                initial="rest"
                whileHover="hover"
                whileTap="tap"
              >
                <AnimatedButton
                  type="submit"
                  disabled={isLoading}
                  $gradientStart={activeGlow}
                  $gradientEnd={
                    isResetting ? "#e040fb" : isRegister ? "#00e5ff" : "#3f51b5"
                  }
                >
                  {isLoading ? (
                    <CircularProgress size={24} color="inherit" />
                  ) : isResetting ? (
                    "Şifre Sıfırlama Bağlantısı Gönder"
                  ) : isRegister ? (
                    "Kayıt Ol"
                  ) : (
                    "Giriş Yap"
                  )}
                </AnimatedButton>
              </motion.div>
            </motion.div>
          </Box>
        </form>

        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mt: 4,
          }}
        >
          <motion.div
            custom={7}
            initial="hidden"
            animate="visible"
            variants={itemVariants}
          >
            {!isResetting && (
              <AnimatedLink
                $color={activeGlow}
                onClick={() => switchMode(isRegister ? "login" : "register")}
                startIcon={isRegister ? <ArrowBack /> : <ArrowForward />}
              >
                {isRegister ? "Giriş Yap" : "Yeni Hesap Oluştur"}
              </AnimatedLink>
            )}
          </motion.div>

          <motion.div
            custom={8}
            initial="hidden"
            animate="visible"
            variants={itemVariants}
          >
            {!isRegister && (
              <AnimatedLink
                $color={activeGlow}
                onClick={() => switchMode(isResetting ? "login" : "reset")}
              >
                {isResetting ? "Giriş Yap" : "Şifremi Unuttum"}
              </AnimatedLink>
            )}
          </motion.div>
        </Box>
      </ContainerCard>
    </AnimatePresence>
  );
};

export default UserAuth;
