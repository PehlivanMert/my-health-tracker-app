import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Container,
  Typography,
  IconButton,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { styled, keyframes } from "@mui/material/styles";
import NotificationsIcon from "@mui/icons-material/Notifications";
import WaterDropIcon from "@mui/icons-material/WaterDrop";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import { motion, AnimatePresence } from "framer-motion";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  setDoc,
} from "firebase/firestore";
import { db } from "../auth/firebaseConfig";
import {
  Medication,
  LocalPharmacy,
  Spa,
  FitnessCenter,
  Opacity,
  HealthAndSafety,
  Vaccines,
} from "@mui/icons-material";
import SupplementDialog from "./SupplementDialog";
import WaterTracker from "./WaterTracker";
import WaterConsumptionChart from "./WaterConsumptionChart";
import SupplementConsumptionChart from "./SupplementConsumptionChart";
import SupplementNotificationSettingsDialog from "./SupplementNotificationSettingsDialog";
import { saveNextSupplementReminderTime } from "../notify/SupplementNotificationScheduler";

const float = keyframes`
  0% { transform: translateY(0px); }
  50% { transform: translateY(-20px); }
  100% { transform: translateY(0px); }
`;

const supplementColors = [
  "#00E676", // Vitamin yeşili
  "#00B0FF", // Mineral mavisi
  "#FF9100", // Protein turuncusu
  "#651FFF", // Omega moru
  "#FF4081", // Özel pembe
  "#00BFA5", // Yeşil-mavi
  "#FFD600", // Altın sarısı
];

const supplementIcons = [
  <LocalPharmacy sx={{ color: "#fff", fontSize: "1.4rem" }} />,
  <Spa sx={{ color: "#fff", fontSize: "1.4rem" }} />,
  <FitnessCenter sx={{ color: "#fff", fontSize: "1.4rem" }} />,
  <Opacity sx={{ color: "#fff", fontSize: "1.4rem" }} />,
  <HealthAndSafety sx={{ color: "#fff", fontSize: "1.4rem" }} />,
  <Vaccines sx={{ color: "#fff", fontSize: "1.4rem" }} />,
];

const getSupplementColor = (name) => {
  if (!name || typeof name !== "string") return "#2196F3"; // Varsayılan renk
  const lowerName = name.toLowerCase();

  // Anahtar kelime kontrolü
  if (lowerName.includes("vitamin")) return "#00E676";
  if (lowerName.includes("mineral")) return "#00B0FF";
  if (lowerName.includes("protein")) return "#FF9100";
  if (lowerName.includes("omega")) return "#651FFF";

  // Hash tabanlı renk
  const hash = name
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return supplementColors[hash % supplementColors.length];
};

const getSupplementIcon = (name) => {
  if (!name || typeof name !== "string")
    return <Medication sx={{ color: "#fff", fontSize: "1.4rem" }} />;
  const lowerName = name.toLowerCase();

  // Anahtar kelime kontrolü
  if (lowerName.includes("vitamin"))
    return <LocalPharmacy sx={{ color: "#fff", fontSize: "1.4rem" }} />;
  if (lowerName.includes("mineral"))
    return <Spa sx={{ color: "#fff", fontSize: "1.4rem" }} />;
  if (lowerName.includes("protein"))
    return <FitnessCenter sx={{ color: "#fff", fontSize: "1.4rem" }} />;
  if (lowerName.includes("omega 3"))
    return <Opacity sx={{ color: "#fff", fontSize: "1.4rem" }} />;

  // Hash tabanlı ikon
  const hash = name
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return supplementIcons[hash % supplementIcons.length];
};

const StyledAccordionSummary = styled(AccordionSummary)(({ theme }) => ({
  background: "linear-gradient(45deg, #2196F3 30%, #3F51B5 90%)",
  borderRadius: '24px !important',
  boxShadow: "0 3px 5px 2px rgba(33, 150, 243, 0.13)",
  color: "white",
  padding: { xs: "8px 20px", sm: "10px 25px", md: "12px 35px" },
  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  cursor: "pointer",
  display: 'flex',
  alignItems: 'center',
  gap: 1.5,
  minHeight: 'unset',
  "& .MuiAccordionSummary-content": {
    margin: { xs: "4px 0", sm: "6px 0", md: "8px 0" },
    display: 'flex',
    alignItems: 'center',
    gap: 1.5,
  },
}));

const AnimatedButton = styled(Button)(({ theme }) => ({
  background: "linear-gradient(45deg, #2196F3 30%, #3F51B5 90%)",
  border: 0,
  borderRadius: 25,
  boxShadow: "0 3px 5px 2px rgba(33, 150, 243, .3)",
  color: "white",
  padding: { xs: "8px 20px", sm: "10px 25px", md: "12px 35px" },
  fontSize: { xs: "0.8rem", sm: "0.9rem", md: "1rem" },
  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  position: "relative",
  overflow: "hidden",
  "&:hover": {
    transform: "scale(1.05)",
    boxShadow: "0 5px 15px 3px rgba(33, 150, 243, .4)",
  },
}));

const CustomAccordion = styled(Accordion)(({ theme }) => ({
  background: 'linear-gradient(45deg, #2196F3 30%, #3F51B5 90%)',
  boxShadow: '0 4px 24px 0 rgba(33,150,243,0.10)',
  marginTop: theme.spacing(2),
  marginBottom: theme.spacing(2),
  overflow: 'hidden',
  border: 'none',
  borderRadius: '24px !important',
  transition: 'box-shadow 0.3s',
  '&.Mui-expanded': {
    boxShadow: '0 8px 32px 0 rgba(33,150,243,0.18)',
    border: 'none',
    borderRadius: '24px !important',
  },
}));

const CustomAccordionDetails = styled(AccordionDetails)(({ theme }) => ({
  background: 'transparent',
  margin: theme.spacing(0, 1, 1, 1),
  padding: theme.spacing(2, 2, 2, 2),
  boxShadow: 'none',
  border: 'none',
  borderRadius: 24,
  transition: 'max-height 0.4s cubic-bezier(0.4,0,0.2,1), opacity 0.3s, background 0.3s',
  overflow: 'hidden',
  '&[aria-hidden="true"]': {
    maxHeight: 0,
    opacity: 0,
    padding: 0,
    background: 'transparent',
    borderRadius: 24,
  },
  '&[aria-hidden="false"]': {
    opacity: 1,
    background: 'transparent',
    borderRadius: 24,
  },
}));

const WellnessTracker = ({ user }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(theme.breakpoints.between("sm", "md"));
  
  if (!user) return <div>Lütfen giriş yapın</div>;

  const [supplements, setSupplements] = useState([]);
  const [openSupplementDialog, setOpenSupplementDialog] = useState(false);
  const [supplementForm, setSupplementForm] = useState({
    name: "",
    quantity: 0,
    dailyUsage: 1,
  });
  const [editingSupplement, setEditingSupplement] = useState(null);
  const [waterData, setWaterData] = useState({ history: [] });
  const [supplementConsumptionToday, setSupplementConsumptionToday] = useState(
    {}
  );
  const [notificationDialogOpen, setNotificationDialogOpen] = useState(false);
  const [
    supplementNotificationDialogOpen,
    setSupplementNotificationDialogOpen,
  ] = useState(false);

  // Korumalı veri yönetimi için ref'ler
  const lastSupplementsState = useRef([]);
  const lastSupplementConsumptionState = useRef({});
  const isDataLoading = useRef(true);
  const isInitialLoad = useRef(true);

  const getSupplementsRef = () =>
    collection(db, "users", user.uid, "supplements");

  const fetchSupplements = async () => {
    const ref = getSupplementsRef();
    try {
      const querySnapshot = await getDocs(ref);
      const supplementsData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setSupplements(supplementsData);
      lastSupplementsState.current = [...supplementsData];
      isDataLoading.current = false;
    } catch (error) {
      console.error("Error fetching supplements:", error);
      isDataLoading.current = false;
    }
  };

  const fetchSupplementConsumptionToday = async () => {
    const docRef = doc(db, "users", user.uid, "stats", "supplementConsumption");
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      const today = new Date().toLocaleDateString("en-CA", {
        timeZone: "Europe/Istanbul",
      });
      const consumptionData = data[today] || {};
      setSupplementConsumptionToday(consumptionData);
      lastSupplementConsumptionState.current = { ...consumptionData };
    } else {
      setSupplementConsumptionToday({});
      lastSupplementConsumptionState.current = {};
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchSupplements();
    fetchSupplementConsumptionToday();
  }, [user]);

  // Takviye tüketim verisi değişikliklerini izle ve korumalı güncelleme yap
  useEffect(() => {
    if (!user || isInitialLoad.current || isDataLoading.current) return;
    
    // Sadece gerçek değişiklik varsa güncelle
    const hasRealChange = JSON.stringify(supplementConsumptionToday) !== JSON.stringify(lastSupplementConsumptionState.current);
    
    if (hasRealChange) {
      const updateSupplementConsumptionInFirestore = async () => {
        try {
          const today = new Date().toLocaleDateString("en-CA", {
            timeZone: "Europe/Istanbul",
          });
          const statsDocRef = doc(db, "users", user.uid, "stats", "supplementConsumption");
          const statsDocSnap = await getDoc(statsDocRef);
          let updatedStats = statsDocSnap.exists() ? statsDocSnap.data() : {};
          updatedStats[today] = supplementConsumptionToday;
          await setDoc(statsDocRef, updatedStats);
          lastSupplementConsumptionState.current = { ...supplementConsumptionToday };
        } catch (error) {
          console.error("Takviye tüketim verisi güncelleme hatası:", error);
        }
      };
      updateSupplementConsumptionInFirestore();
    }
  }, [supplementConsumptionToday, user]);

  // Takviye bildirim sistemini temizleme fonksiyonu
  const cleanupSupplementNotifications = async () => {
    if (!supplements.length || !user) return;

    console.log("Takviye bildirim sistemi temizleniyor...");
    
    for (const supp of supplements) {
      const suppDocRef = doc(db, "users", user.uid, "supplements", supp.id);
      try {
        // Gereksiz alanları temizle
        await updateDoc(suppDocRef, {
          lastNotificationTriggers: null,
          globalNotificationWindow: null,
          notificationsLastCalculated: null,
          // Sadece gerekli alanları tut
          nextSupplementReminderTime: null, // Yeniden hesaplanacak
        });
        console.log(`${supp.name} için bildirim sistemi temizlendi`);
      } catch (error) {
        console.error(`${supp.name} temizleme hatası:`, error);
      }
    }
  };

  // Takviye bildirimlerini yeniden hesaplama fonksiyonu
  const recalculateAllSupplementNotifications = async () => {
    if (!supplements.length || !user) return;

    console.log("Tüm takviye bildirimleri yeniden hesaplanıyor...");
    
    for (const supp of supplements) {
      try {
        await saveNextSupplementReminderTime(user, supp);
        console.log(`${supp.name} için bildirim zamanı yeniden hesaplandı`);
      } catch (error) {
        console.error(`${supp.name} hesaplama hatası:`, error);
      }
    }
  };

  useEffect(() => {
    const checkAndUpdateReminders = async () => {
      if (!supplements.length || !user) return;

      // Önce temizlik yap
      await cleanupSupplementNotifications();
      
      // Sonra yeniden hesapla
      await recalculateAllSupplementNotifications();
    };

    checkAndUpdateReminders();
  }, [supplements, user]);

  const handleSaveSupplement = async () => {
    const ref = getSupplementsRef();
    try {
      if (editingSupplement) {
        const supplementRef = doc(ref, editingSupplement.id);
        await updateDoc(supplementRef, {
          ...supplementForm,
          lastUpdated: new Date(),
        });
      } else {
        await addDoc(ref, {
          ...supplementForm,
          createdAt: new Date(),
          lastUpdated: new Date(),
        });
      }
      await fetchSupplements();
      setOpenSupplementDialog(false);
      setEditingSupplement(null);
      setSupplementForm({ name: "", quantity: 0, dailyUsage: 1 });
    } catch (error) {
      console.error("Error saving supplement:", error);
    }
  };

  const handleConsume = async (id) => {
    const ref = getSupplementsRef();
    try {
      const supplement = supplements.find((supp) => supp.id === id);
      const newQuantity = Math.max(0, supplement.quantity - 1);
      const supplementRef = doc(ref, id);
      await updateDoc(supplementRef, { quantity: newQuantity });
      await fetchSupplements();
      const suppName = supplement.name;
      const today = new Date().toLocaleDateString("en-CA", {
        timeZone: "Europe/Istanbul",
      });
      const statsDocRef = doc(
        db,
        "users",
        user.uid,
        "stats",
        "supplementConsumption"
      );
      const statsDocSnap = await getDoc(statsDocRef);
      let updatedStats = statsDocSnap.exists() ? statsDocSnap.data() : {};
      if (!updatedStats[today]) updatedStats[today] = {};
      updatedStats[today][suppName] = (updatedStats[today][suppName] || 0) + 1;
      updatedStats[today].total = (updatedStats[today].total || 0) + 1;
      await setDoc(statsDocRef, updatedStats);
      await fetchSupplementConsumptionToday();
      // Takviye tüketildiğinde bildirim zamanını güncelleyelim (tüketim verisi güncellendikten sonra)
      await saveNextSupplementReminderTime(user, supplement);
    } catch (error) {
      console.error("Error consuming supplement:", error);
    }
  };

  const handleDelete = async (id) => {
    const ref = getSupplementsRef();
    try {
      const supplementRef = doc(ref, id);
      await deleteDoc(supplementRef);
      await fetchSupplements();
    } catch (error) {
      console.error("Error deleting supplement:", error);
    }
  };

  const handleEditSupplement = (supplement) => {
    setEditingSupplement(supplement);
    setSupplementForm({
      name: supplement.name,
      quantity: supplement.quantity,
      dailyUsage: supplement.dailyUsage,
    });
    setOpenSupplementDialog(true);
  };

  const handleSaveSupplementNotifications = async (notifications) => {
    try {
      // notifications artık array formatında geliyor: [{id, notificationSchedule}, ...]
      for (const notification of notifications) {
        const supplementRef = doc(db, "users", user.uid, "supplements", notification.id);
        
        // notificationSchedule array'ini kontrol et
        const updateData = {};
        
        if (notification.notificationSchedule && Array.isArray(notification.notificationSchedule)) {
          updateData.notificationSchedule = notification.notificationSchedule;
        }
        
        // Sadece tanımlı değerler varsa güncelle
        if (Object.keys(updateData).length > 0) {
          await updateDoc(supplementRef, updateData);
          
          // Takviye verilerini al ve nextSupplementReminderTime'ı yeniden hesapla
          const supplementDoc = await getDoc(supplementRef);
          if (supplementDoc.exists()) {
            const supplementData = supplementDoc.data();
            
            // nextSupplementReminderTime'ı yeniden hesapla
            await saveNextSupplementReminderTime(user, {
              ...supplementData,
              id: notification.id,
              notificationSchedule: notification.notificationSchedule,
            });
            
            console.log(`${supplementData.name} için bildirim zamanı yeniden hesaplandı`);
          }
        }
      }
      // supplements listesini güncelle
      await fetchSupplements();
      setSupplementNotificationDialogOpen(false);
    } catch (error) {
      console.error("Error saving supplement notifications:", error);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, #1a2a6c 0%, #2196F3 50%, #3F51B5 100%)",
        padding: { xs: 1, sm: 2, md: 4 },
      }}
    >
      <Container maxWidth="lg">
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: { xs: 2, sm: 3, md: 4 },
            flexDirection: { xs: "column", sm: "row" },
            gap: { xs: 2, sm: 0 },
          }}
        >
          <Typography
            variant="h2"
            sx={{
              textAlign: "center",
              color: "#fff",
              fontWeight: 800,
              mt: { xs: 2, sm: 3, md: 6 },
              textShadow: "2px 2px 4px rgba(0,0,0,0.3)",
              animation: `${float} 3s ease-in-out infinite`,
              fontSize: { xs: "1.5rem", sm: "2rem", md: "3rem" },
            }}
          >
            <WaterDropIcon
              sx={{ 
                fontSize: { xs: 24, sm: 30, md: 50 }, 
                color: "lightblue", 
                mr: { xs: 1, sm: 2 },
                verticalAlign: "middle",
              }}
            />
            Takviye & Su Tüketimi
          </Typography>
          
          <Box sx={{ 
            display: "flex", 
            gap: { xs: 1, sm: 2 },
            flexDirection: { xs: "row", sm: "row" },
            width: { xs: "100%", sm: "auto" },
            justifyContent: { xs: "center", sm: "flex-end" },
          }}>
            <AnimatedButton
              onClick={() => setOpenSupplementDialog(true)}
              startIcon={<AddIcon sx={{ fontSize: { xs: "1rem", sm: "1.2rem", md: "1.5rem" } }} />}
              sx={{ 
                fontSize: { xs: "0.7rem", sm: "0.8rem", md: "1rem" },
                padding: { xs: "6px 12px", sm: "8px 16px", md: "12px 24px" },
              }}
            >
              Takviye Ekle
            </AnimatedButton>
            <AnimatedButton
              onClick={() => setSupplementNotificationDialogOpen(true)}
              startIcon={<NotificationsIcon sx={{ fontSize: { xs: "1rem", sm: "1.2rem", md: "1.5rem" } }} />}
              sx={{ 
                fontSize: { xs: "0.7rem", sm: "0.8rem", md: "1rem" },
                padding: { xs: "6px 12px", sm: "8px 16px", md: "12px 24px" },
              }}
            >
              Bildirimler
            </AnimatedButton>
          </Box>
        </Box>

        {/* Su Takibi */}
        <CustomAccordion defaultExpanded={true}>
          <StyledAccordionSummary>
            <WaterDropIcon sx={{ fontSize: { xs: 28, sm: 32, md: 36 }, color: '#fff', mr: 1 }} />
            <Typography variant="h5" sx={{ 
              fontWeight: 700, 
              color: "#fff",
              fontSize: { xs: "1.1rem", sm: "1.3rem", md: "1.5rem" },
            }}>
              Su Takibi
            </Typography>
          </StyledAccordionSummary>
          <CustomAccordionDetails>
            <WaterTracker 
              user={user} 
              onWaterDataChange={(data) => setWaterData(data)}
            />
          </CustomAccordionDetails>
        </CustomAccordion>

        {/* Takviye Listesi */}
        <CustomAccordion defaultExpanded={false}>
          <StyledAccordionSummary>
            <Medication sx={{ fontSize: { xs: 28, sm: 32, md: 36 }, color: '#fff', mr: 1 }} />
            <Typography variant="h5" sx={{ 
              fontWeight: 700, 
              color: "#fff",
              fontSize: { xs: "1.1rem", sm: "1.3rem", md: "1.5rem" },
            }}>
              Takviyelerim
            </Typography>
          </StyledAccordionSummary>
          <CustomAccordionDetails>
            {supplements.length === 0 ? (
              <Box
                sx={{
                  textAlign: "center",
                  py: { xs: 4, sm: 6, md: 8 },
                  color: "rgba(255,255,255,0.7)",
                }}
              >
                <Typography variant="h6" sx={{ 
                  mb: 2,
                  fontSize: { xs: "1rem", sm: "1.2rem", md: "1.5rem" },
                }}>
                  Henüz takviye eklenmemiş
                </Typography>
                <Typography variant="body1" sx={{ 
                  fontSize: { xs: "0.85rem", sm: "1rem", md: "1.1rem" },
                }}>
                  İlk takviyenizi eklemek için "Takviye Ekle" butonuna tıklayın
                </Typography>
              </Box>
            ) : (
              <Grid container spacing={{ xs: 1, sm: 2, md: 3 }}>
                {supplements.map((supplement) => {
                  const { name, quantity, dailyUsage } = supplement;
                  const consumedToday = supplementConsumptionToday[name] || 0;
                  const remainingToday = Math.max(0, dailyUsage - consumedToday);
                  const daysLeft = Math.ceil(quantity / dailyUsage);
                  const progress = Math.min(100, (consumedToday / dailyUsage) * 100);

                  return (
                    <Grid item xs={12} sm={6} md={4} key={supplement.id}>
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                      >
                        <Box
                          sx={{
                            background: "rgba(255,255,255,0.1)",
                            borderRadius: "20px",
                            p: { xs: 2, sm: 2.5, md: 3 },
                            backdropFilter: "blur(10px)",
                            border: "1px solid rgba(255,255,255,0.2)",
                            position: "relative",
                            overflow: "hidden",
                            "&::before": {
                              content: '""',
                              position: "absolute",
                              top: 0,
                              left: 0,
                              right: 0,
                              height: "4px",
                              background: getSupplementColor(name),
                            },
                          }}
                        >
                          {/* Header */}
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              mb: { xs: 1.5, sm: 2 },
                            }}
                          >
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: { xs: 1, sm: 1.5 },
                              }}
                            >
                              <Box
                                sx={{
                                  width: { xs: 32, sm: 36, md: 40 },
                                  height: { xs: 32, sm: 36, md: 40 },
                                  borderRadius: "50%",
                                  background: getSupplementColor(name),
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
                                }}
                              >
                                {getSupplementIcon(name)}
                              </Box>
                              <Typography
                                variant="h6"
                                sx={{
                                  color: "#fff",
                                  fontWeight: 600,
                                  fontSize: { xs: "0.9rem", sm: "1rem", md: "1.1rem" },
                                  lineHeight: 1.2,
                                }}
                              >
                                {name}
                              </Typography>
                            </Box>
                            <Box sx={{ display: "flex", gap: { xs: 0.5, sm: 1 } }}>
                              <Tooltip title="Düzenle">
                                <IconButton
                                  size="small"
                                  onClick={() => handleEditSupplement(supplement)}
                                  sx={{
                                    color: "rgba(255,255,255,0.7)",
                                    "&:hover": { color: "#fff" },
                                    padding: { xs: "4px", sm: "6px" },
                                  }}
                                >
                                  <EditIcon sx={{ fontSize: { xs: "1rem", sm: "1.2rem" } }} />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Sil">
                                <IconButton
                                  size="small"
                                  onClick={() => handleDelete(supplement.id)}
                                  sx={{
                                    color: "rgba(255,255,255,0.7)",
                                    "&:hover": { color: "#ff4444" },
                                    padding: { xs: "4px", sm: "6px" },
                                  }}
                                >
                                  <DeleteIcon sx={{ fontSize: { xs: "1rem", sm: "1.2rem" } }} />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </Box>

                          {/* İlerleme Çubuğu */}
                          <Box sx={{ mt: 2, mb: 2 }}>
                            <Box
                              sx={{
                                height: { xs: 4, sm: 6 },
                                bgcolor: "rgba(255,255,255,0.15)",
                                borderRadius: 3,
                                overflow: "hidden",
                              }}
                            >
                              <Box
                                sx={{
                                  width: `${progress}%`,
                                  height: "100%",
                                  bgcolor: getSupplementColor(name),
                                  transition: "width 0.5s ease",
                                }}
                              />
                            </Box>
                            <Box
                              sx={{
                                display: "flex",
                                justifyContent: "space-between",
                                mt: 1,
                                color: "rgba(255,255,255,0.8)",
                                fontSize: { xs: "0.7rem", sm: "0.8rem", md: "0.85rem" },
                              }}
                            >
                              <span>{supplement.quantity} adet</span>
                              <span>{daysLeft}gün kaldı</span>
                            </Box>
                          </Box>

                          {/* Günlük Tüketim */}
                          <Box
                            sx={{
                              bgcolor: "rgba(255,255,255,0.1)",
                              borderRadius: "14px",
                              p: { xs: 1.5, sm: 2 },
                              mt: 2,
                            }}
                          >
                            <Box
                              sx={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                mb: 1,
                              }}
                            >
                              <Typography
                                variant="body2"
                                sx={{ 
                                  color: "rgba(255,255,255,0.8)",
                                  fontSize: { xs: "0.75rem", sm: "0.8rem", md: "0.85rem" },
                                }}
                              >
                                Günlük Tüketim
                              </Typography>
                              <Typography
                                variant="body2"
                                sx={{
                                  color: getSupplementColor(name),
                                  fontWeight: 600,
                                  fontSize: { xs: "0.75rem", sm: "0.8rem", md: "0.85rem" },
                                }}
                              >
                                {supplement.dailyUsage} adet
                              </Typography>
                            </Box>

                            <Box
                              sx={{
                                display: "flex",
                                gap: 1,
                                alignItems: "center",
                              }}
                            >
                              <Box
                                sx={{
                                  width: { xs: 24, sm: 28, md: 30 },
                                  height: { xs: 24, sm: 28, md: 30 },
                                  bgcolor: "rgba(255,255,255,0.15)",
                                  borderRadius: "8px",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  color: "#fff",
                                  fontSize: { xs: "0.7rem", sm: "0.8rem", md: "0.85rem" },
                                }}
                              >
                                {consumedToday}
                              </Box>
                              <Typography
                                variant="body2"
                                sx={{ 
                                  color: "rgba(255,255,255,0.6)",
                                  fontSize: { xs: "0.7rem", sm: "0.75rem", md: "0.8rem" },
                                }}
                              >
                                Tüketilen
                              </Typography>
                              <Box sx={{ flex: 1, textAlign: "right" }}>
                                <Typography
                                  variant="body2"
                                  sx={{
                                    color: getSupplementColor(name),
                                    fontWeight: 600,
                                    fontSize: { xs: "0.7rem", sm: "0.75rem", md: "0.8rem" },
                                  }}
                                >
                                  {remainingToday} adet kaldı
                                </Typography>
                              </Box>
                            </Box>
                          </Box>

                          {/* Tüket Butonu */}
                          <Box sx={{ mt: 2, textAlign: "center" }}>
                            <Button
                              variant="contained"
                              onClick={() => handleConsume(supplement.id)}
                              disabled={supplement.quantity === 0}
                              sx={{
                                background: getSupplementColor(name),
                                color: "#fff",
                                borderRadius: "20px",
                                px: { xs: 2, sm: 3 },
                                py: { xs: 1, sm: 1.5 },
                                fontSize: { xs: "0.75rem", sm: "0.8rem", md: "0.9rem" },
                                fontWeight: 600,
                                textTransform: "none",
                                "&:hover": {
                                  background: getSupplementColor(name),
                                  opacity: 0.9,
                                },
                                "&:disabled": {
                                  background: "rgba(255,255,255,0.2)",
                                  color: "rgba(255,255,255,0.5)",
                                },
                              }}
                            >
                              {supplement.quantity === 0 ? "Tükendi" : "Tüket"}
                            </Button>
                          </Box>
                        </Box>
                      </motion.div>
                    </Grid>
                  );
                })}
              </Grid>
            )}
          </CustomAccordionDetails>
        </CustomAccordion>
        
        <CustomAccordion defaultExpanded={false} sx={{ borderRadius: 24, overflow: 'hidden' }}>
          <StyledAccordionSummary>
            <EmojiEventsIcon sx={{ fontSize: { xs: 28, sm: 32, md: 36 }, color: '#fff', mr: 1 }} />
            <Typography variant="h5" sx={{ 
              fontWeight: 700, 
              color: "#fff",
              fontSize: { xs: "1.1rem", sm: "1.3rem", md: "1.5rem" },
            }}>
              İstatistikler
            </Typography>
          </StyledAccordionSummary>
          <CustomAccordionDetails sx={{ borderRadius: 24, overflow: 'hidden' }}>
            <Grid container spacing={{ xs: 2, sm: 3, md: 4 }} sx={{ mt: 2, borderRadius: 24, overflow: 'hidden' }}>
              <Grid item xs={12} md={6} sx={{ borderRadius: 24, overflow: 'hidden' }}>
                <Box sx={{ borderRadius: 24, overflow: 'hidden' }}>
                  <WaterConsumptionChart waterHistory={Array.isArray(waterData.history) ? waterData.history : []} />
                </Box>
              </Grid>
              <Grid item xs={12} md={6} sx={{ borderRadius: 24, overflow: 'hidden' }}>
                <Box sx={{ borderRadius: 24, overflow: 'hidden' }}>
                  <SupplementConsumptionChart
                    user={user}
                    supplements={supplements}
                  />
                </Box>
              </Grid>
            </Grid>
          </CustomAccordionDetails>
        </CustomAccordion>
        <SupplementDialog
          openSupplementDialog={openSupplementDialog}
          onClose={() => {
            setOpenSupplementDialog(false);
            setEditingSupplement(null);
          }}
          editingSupplement={editingSupplement}
          supplementForm={supplementForm}
          setSupplementForm={setSupplementForm}
          setOpenSupplementDialog={setOpenSupplementDialog}
          setEditingSupplement={setEditingSupplement}
          handleSaveSupplement={handleSaveSupplement}
        />
        <SupplementNotificationSettingsDialog
          open={supplementNotificationDialogOpen}
          onClose={() => setSupplementNotificationDialogOpen(false)}
          supplements={supplements}
          onSave={handleSaveSupplementNotifications}
        />
      </Container>
    </Box>
  );
};

export default WellnessTracker;
