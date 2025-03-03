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

import NotificationSettingsDialog from "./NotificationSettingsDialog";
import WaterTracker from "./WaterTracker";
import WaterConsumptionChart from "./WaterConsumptionChart";
import SupplementConsumptionChart from "./SupplementConsumptionChart";
import SupplementNotificationSettingsDialog from "./SupplementNotificationSettingsDialog";

// WeatherWidget projenizde mevcut, dolayısıyla burada import edilmiyor.

const float = keyframes`
  0% { transform: translateY(0px); }
  50% { transform: translateY(-20px); }
  100% { transform: translateY(0px); }
`;

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
    const ref = getSupplementsRef();
    try {
      for (const supp of updatedSupplements) {
        const suppRef = doc(ref, supp.id);
        await updateDoc(suppRef, {
          notificationSchedule: supp.notificationSchedule,
        });
      }
      await fetchSupplements();
    } catch (error) {
      console.error("Takviye bildirim ayarları güncelleme hatası:", error);
    }
  };

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
                sx={{ color: "#fff" }}
              >
                <NotificationsIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
        {/* WeatherWidget projede mevcut olduğu için burada render edilmedi */}
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
                  onClick={(e) => {
                    e.stopPropagation();
                    setSupplementNotificationDialogOpen(true);
                  }}
                  sx={{ color: "#fff" }}
                >
                  <NotificationsIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </StyledAccordionSummary>
          <AccordionDetails>
            <Grid container spacing={4} sx={{ mt: 2 }}>
              <AnimatePresence>
                {supplements.map((supplement) => (
                  <Grid item xs={12} sm={6} md={4} key={supplement.id}>
                    <Box
                      sx={{
                        background: "rgba(255,255,255,0.1)",
                        borderRadius: "24px",
                        padding: 2,
                        boxShadow: "0 0 20px rgba(33,150,243,0.3)",
                        transition: "all 0.5s",
                        "&:hover": {
                          transform: "translateY(-10px) scale(1.02)",
                        },
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <Typography
                          variant="h5"
                          sx={{ fontWeight: 700, color: "#fff" }}
                        >
                          {supplement.name}
                        </Typography>
                        <IconButton
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(supplement.id);
                          }}
                          sx={{
                            color: "#fff",
                            transition: "all 0.3s",
                            "&:hover": {
                              transform: "rotate(90deg)",
                              color: "#FF5252",
                            },
                          }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                      <Box sx={{ mt: 3, mb: 3 }}>
                        <Typography
                          variant="body1"
                          sx={{ color: "#fff", opacity: 0.9, mb: 1 }}
                        >
                          Kalan: {supplement.quantity} /{" "}
                          {supplement.initialQuantity}
                        </Typography>
                        <Typography
                          variant="body1"
                          sx={{ color: "#fff", opacity: 0.9 }}
                        >
                          Tahmini Kalan Gün:{" "}
                          {Math.floor(
                            supplement.quantity / supplement.dailyUsage
                          )}
                        </Typography>
                        <Typography
                          variant="body1"
                          sx={{ color: "#fff", opacity: 0.9, mt: 1 }}
                        >
                          Bugün: Tüketilen{" "}
                          {supplementConsumptionToday[supplement.name] || 0} /
                          Kalan{" "}
                          {Math.max(
                            0,
                            supplement.dailyUsage -
                              (supplementConsumptionToday[supplement.name] || 0)
                          )}
                        </Typography>
                      </Box>
                      <AnimatedButton
                        fullWidth
                        onClick={() => handleConsume(supplement.id)}
                        disabled={supplement.quantity <= 0}
                        startIcon={<EmojiEventsIcon />}
                      >
                        Günlük Dozu Al
                      </AnimatedButton>
                    </Box>
                  </Grid>
                ))}
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
