import React, { useState, useEffect } from "react";
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
} from "@mui/material";
import { styled, keyframes } from "@mui/material/styles";
import NotificationsIcon from "@mui/icons-material/Notifications";
import WaterDropIcon from "@mui/icons-material/WaterDrop";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
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

import NotificationSettingsDialog from "./NotificationSettingsDialog";
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
  borderRadius: 25,
  boxShadow: "0 3px 5px 2px rgba(33, 150, 243, 0.3)",
  color: "white",
  padding: "12px 35px",
  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  cursor: "pointer",
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
}));

const WellnessTracker = ({ user }) => {
  if (!user) return <div>Lütfen giriş yapın</div>;

  const [supplements, setSupplements] = useState([]);
  const [openSupplementDialog, setOpenSupplementDialog] = useState(false);
  const [newSupplement, setNewSupplement] = useState({
    name: "",
    quantity: 0,
    dailyUsage: 1,
  });
  const [waterData, setWaterData] = useState({ history: [] });
  const [supplementConsumptionToday, setSupplementConsumptionToday] = useState(
    {}
  );
  const [notificationDialogOpen, setNotificationDialogOpen] = useState(false);
  const [
    supplementNotificationDialogOpen,
    setSupplementNotificationDialogOpen,
  ] = useState(false);

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
    } catch (error) {
      console.error("Error fetching supplements:", error);
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
      setSupplementConsumptionToday(data[today] || {});
    }
  };

  useEffect(() => {
    fetchSupplements();
    fetchSupplementConsumptionToday();
  }, [user]);

  const handleAddSupplement = async () => {
    const ref = getSupplementsRef();
    try {
      await addDoc(ref, {
        ...newSupplement,
        quantity: Number(newSupplement.quantity),
        initialQuantity: Number(newSupplement.quantity),
        dailyUsage: Number(newSupplement.dailyUsage),
      });
      await fetchSupplements();
      setOpenSupplementDialog(false);
      setNewSupplement({ name: "", quantity: 0, dailyUsage: 1 });
    } catch (error) {
      console.error("Error adding supplement:", error);
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

  const handleSaveNotificationWindow = async (window) => {
    const userRef = doc(db, "users", user.uid);
    try {
      await setDoc(userRef, { notificationWindow: window }, { merge: true });
    } catch (error) {
      console.error("Bildirim ayarları güncelleme hatası:", error);
    }
  };

  const handleSaveSupplementNotifications = async (updatedSupplements) => {
    const ref = getSupplementsRef(); // Firestore'daki supplements koleksiyonuna erişim sağlayan fonksiyon
    try {
      for (const updatedSupp of updatedSupplements) {
        // Mevcut supplement verisini supplements dizisinden bul
        const supp = supplements.find((s) => s.id === updatedSupp.id);
        if (!supp) continue;

        // Yeni notificationSchedule değerini supplement nesnesine ekle
        const newSupp = {
          ...supp,
          notificationSchedule: updatedSupp.notificationSchedule,
        };

        // Firestore'da notificationSchedule alanını güncelle
        const suppRef = doc(ref, newSupp.id);
        await updateDoc(suppRef, {
          notificationSchedule: newSupp.notificationSchedule,
        });

        // nextSupplementReminderTime'ı hesapla ve kaydet
        await saveNextSupplementReminderTime(user, newSupp);
      }
      await fetchSupplements(); // Güncel veriyi çekmek için
    } catch (error) {
      console.error("Takviye bildirim ayarları güncelleme hatası:", error);
    }
  };

  // supplements ve user güncellendiğinde nextSupplementReminderTime hesaplaması
  useEffect(() => {
    if (supplements && user) {
      supplements.forEach(async (supp) => {
        await saveNextSupplementReminderTime(user, supp);
      });
    }
  }, [supplements, user]);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, #1a2a6c 0%, #2196F3 50%, #3F51B5 100%)",
        padding: { xs: 2, md: 4 },
      }}
    >
      <Container maxWidth="lg">
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: { xs: 2, md: 4 },
          }}
        >
          <Typography
            variant="h2"
            sx={{
              textAlign: "center",
              color: "#fff",
              fontWeight: 800,
              mt: { xs: 4, md: 6 },
              textShadow: "2px 2px 4px rgba(0,0,0,0.3)",
              animation: `${float} 3s ease-in-out infinite`,
              fontSize: { xs: "2rem", md: "3rem" },
            }}
          >
            <WaterDropIcon
              sx={{ fontSize: { xs: 30, md: 50 }, color: "lightblue", mr: 2 }}
            />
            Takviye Takibi
          </Typography>
          <Box>
            <Tooltip title="Global Bildirim Ayarları">
              <IconButton
                onClick={() => setNotificationDialogOpen(true)}
                sx={{
                  color: "#fff",
                  "&:hover": {
                    color: "#FFD700",
                    transform: "scale(1.1)",
                  },
                }}
              >
                <NotificationsIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        <WaterTracker user={user} onWaterDataChange={setWaterData} />
        <Box sx={{ mt: 4, textAlign: "center" }}>
          <AnimatedButton
            onClick={() => setOpenSupplementDialog(true)}
            startIcon={<AddIcon />}
            sx={{ minWidth: 200 }}
          >
            Yeni Takviye Ekle
          </AnimatedButton>
        </Box>
        <Accordion
          defaultExpanded={false}
          sx={{
            background: "transparent",
            boxShadow: "none",
            color: "#fff",
            mt: 4,
          }}
        >
          <StyledAccordionSummary>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                width: "100%",
                justifyContent: "space-between",
              }}
            >
              <Typography variant="h5" sx={{ fontWeight: 700, color: "#fff" }}>
                Takviyeler
              </Typography>
              <Tooltip title="Takviye Bildirim Ayarları">
                <IconButton
                  component="span"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSupplementNotificationDialogOpen(true);
                  }}
                  sx={{
                    color: "#fff",
                    transition: "all 0.3s ease-in-out",
                    "&:hover": {
                      color: "#FFD700",
                      transform: "scale(1.1)",
                    },
                  }}
                >
                  <NotificationsIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </StyledAccordionSummary>
          <AccordionDetails>
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <AnimatePresence>
                {(supplements || []).map((supplement) => {
                  // supplements undefined olma ihtimaline karşı
                  const name = supplement?.name || "Unknown"; // Güvenli name erişimi
                  const progress =
                    (supplement.quantity / supplement.initialQuantity) * 100;
                  const daysLeft = Math.floor(
                    supplement.quantity / supplement.dailyUsage
                  );
                  const consumedToday =
                    supplementConsumptionToday[supplement.name] || 0;
                  const remainingToday = Math.max(
                    0,
                    supplement.dailyUsage - consumedToday
                  );

                  return (
                    <Grid item xs={12} sm={6} md={4} key={supplement.id}>
                      <Box
                        sx={{
                          background: `linear-gradient(135deg, ${getSupplementColor(
                            name
                          )} 0%, rgba(255,255,255,0.1) 100%)`,
                          borderRadius: "20px",
                          p: 3,
                          boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
                          backdropFilter: "blur(8px)",
                          border: "1px solid rgba(255,255,255,0.2)",
                          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                          "&:hover": {
                            transform: "translateY(-5px)",
                            boxShadow: "0 12px 40px rgba(33,150,243,0.2)",
                          },
                        }}
                      >
                        {/* Üst Bilgi */}
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1.5,
                            }}
                          >
                            <Box
                              sx={{
                                bgcolor: "rgba(255,255,255,0.15)",
                                p: 1.2,
                                borderRadius: "12px",
                                display: "flex",
                              }}
                            >
                              {getSupplementIcon(name)}
                            </Box>
                            <Typography
                              variant="h6"
                              sx={{
                                fontWeight: 700,
                                color: "#fff",
                                textTransform: "capitalize",
                              }}
                            >
                              {supplement.name}
                            </Typography>
                          </Box>
                          <IconButton
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(supplement.id);
                            }}
                            sx={{
                              color: "rgba(255,255,255,0.7)",
                              transition: "all 0.3s",
                              "&:hover": {
                                color: "#ff5252",
                                transform: "rotate(90deg)",
                              },
                            }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>

                        {/* İlerleme Çubuğu */}
                        <Box sx={{ mt: 2, mb: 2 }}>
                          <Box
                            sx={{
                              height: 6,
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
                              fontSize: "0.85rem",
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
                            p: 2,
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
                              sx={{ color: "rgba(255,255,255,0.8)" }}
                            >
                              Günlük Tüketim
                            </Typography>
                            <Typography
                              variant="body2"
                              sx={{
                                color: getSupplementColor(name),
                                fontWeight: 600,
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
                                width: 30,
                                height: 30,
                                bgcolor: "rgba(255,255,255,0.15)",
                                borderRadius: "8px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "#fff",
                              }}
                            >
                              {consumedToday}
                            </Box>
                            <Typography
                              variant="body2"
                              sx={{ color: "rgba(255,255,255,0.6)" }}
                            >
                              Tüketilen
                            </Typography>
                            <Box sx={{ flex: 1, textAlign: "right" }}>
                              <Typography
                                variant="body2"
                                sx={{
                                  color: getSupplementColor(name),
                                  fontWeight: 600,
                                }}
                              >
                                {remainingToday} adet kaldı
                              </Typography>
                            </Box>
                          </Box>
                        </Box>

                        {/* Aksiyon Butonu */}
                        <Button
                          fullWidth
                          variant="contained"
                          onClick={() => handleConsume(supplement.id)}
                          disabled={supplement.quantity <= 0}
                          sx={{
                            mt: 2,
                            bgcolor: "rgba(255,255,255,0.15)",
                            color: "#fff",
                            borderRadius: "12px",
                            py: 1.5,
                            textTransform: "none",
                            fontWeight: 600,
                            backdropFilter: "blur(4px)",
                            "&:hover": {
                              bgcolor: getSupplementColor(name),
                            },
                            "&:disabled": {
                              bgcolor: "rgba(255,255,255,0.05)",
                            },
                          }}
                          startIcon={
                            <EmojiEventsIcon
                              sx={{ color: "rgba(255,255,255,0.8)" }}
                            />
                          }
                        >
                          Dozu Tamamla
                        </Button>
                      </Box>
                    </Grid>
                  );
                })}
              </AnimatePresence>
            </Grid>
          </AccordionDetails>
        </Accordion>
        <Accordion
          defaultExpanded={false}
          sx={{
            background: "transparent",
            boxShadow: "none",
            color: "#fff",
            mt: 4,
          }}
        >
          <StyledAccordionSummary>
            <Typography variant="h5" sx={{ fontWeight: 700, color: "#fff" }}>
              İstatistikler
            </Typography>
          </StyledAccordionSummary>
          <AccordionDetails>
            <Grid container spacing={4} sx={{ mt: 2 }}>
              <Grid item xs={12} md={6}>
                <WaterConsumptionChart waterHistory={waterData.history} />
              </Grid>
              <Grid item xs={12} md={6}>
                <SupplementConsumptionChart
                  user={user}
                  supplements={supplements}
                />
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>
        <Dialog
          open={openSupplementDialog}
          onClose={() => setOpenSupplementDialog(false)}
          PaperProps={{
            sx: {
              background: "rgba(149, 157, 163, 0.83)",
              backdropFilter: "blur(10px)",
              borderRadius: "24px",
              padding: 2,
              border: "1px solid rgba(33,150,243,0.2)",
            },
          }}
        >
          <DialogTitle>Yeni Takviye Ekle</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Takviye Adı"
              fullWidth
              value={newSupplement.name}
              onChange={(e) =>
                setNewSupplement({ ...newSupplement, name: e.target.value })
              }
              sx={{ mb: 2 }}
            />
            <TextField
              margin="dense"
              label="Miktar"
              type="number"
              fullWidth
              value={newSupplement.quantity}
              onChange={(e) =>
                setNewSupplement({
                  ...newSupplement,
                  quantity: Number(e.target.value),
                })
              }
              sx={{ mb: 2 }}
            />
            <TextField
              margin="dense"
              label="Günlük Kullanım Miktarı"
              type="number"
              fullWidth
              value={newSupplement.dailyUsage}
              onChange={(e) =>
                setNewSupplement({
                  ...newSupplement,
                  dailyUsage: Number(e.target.value),
                })
              }
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenSupplementDialog(false)}>
              İptal
            </Button>
            <Button onClick={handleAddSupplement}>Ekle</Button>
          </DialogActions>
        </Dialog>
        <NotificationSettingsDialog
          open={notificationDialogOpen}
          onClose={() => setNotificationDialogOpen(false)}
          user={user}
          onSave={handleSaveNotificationWindow}
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
