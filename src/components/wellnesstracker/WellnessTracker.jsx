import React, { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  TextField,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Slide,
  Container,
  useTheme,
  alpha,
} from "@mui/material";
import { styled, keyframes } from "@mui/material/styles";
import Confetti from "react-confetti";
import Lottie from "lottie-react";
import waterAnimation from "../../waterAnimation.json";
import { db } from "../auth/firebaseConfig";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  setDoc,
  getDoc,
} from "firebase/firestore";
import LocalDrinkIcon from "@mui/icons-material/LocalDrink";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import OpacityIcon from "@mui/icons-material/Opacity";
import { motion, AnimatePresence } from "framer-motion";

// Animated keyframes
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
const GlowingCard = styled(Card)(({ theme, glowColor }) => ({
  position: "relative",
  background: "rgba(33, 150, 243, 0.1)",
  backdropFilter: "blur(10px)",
  borderRadius: "24px",
  overflow: "hidden",
  border: "1px solid rgba(33, 150, 243, 0.2)",
  boxShadow: `0 0 20px ${glowColor || "#2196F322"}`,
  transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
  "&:hover": {
    transform: "translateY(-10px) scale(1.02)",
    boxShadow: `0 0 40px ${glowColor || "#2196F344"}`,
  },
  "&::before": {
    content: '""',
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: `linear-gradient(135deg, ${alpha(
      glowColor || "#2196F3",
      0.2
    )} 0%, transparent 100%)`,
    opacity: 0,
    transition: "opacity 0.3s ease",
  },
  "&:hover::before": {
    opacity: 1,
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

const WaterContainer = styled(Box)(({ theme }) => ({
  position: "relative",
  width: "100%",
  height: "500px",
  borderRadius: "30px",
  overflow: "hidden",
  background: "rgba(0, 0, 0, 0.2)",
  boxShadow: "inset 0 0 50px rgba(0, 0, 0, 0.2)",
}));

const FloatingIcon = styled(Box)(({ delay = 0 }) => ({
  animation: `${float} 3s ease-in-out infinite`,
  animationDelay: `${delay}s`,
}));

// Color utils
const getVitaminColor = (remainingPercentage) => {
  if (remainingPercentage > 66) return "#2196F3"; // Primary blue
  if (remainingPercentage > 33) return "#00BCD4"; // Secondary blue
  return "#3F51B5"; // Dark blue
};

// Achievement Component
const Achievement = ({ message }) => (
  <Slide direction="down" in={true}>
    <Box
      sx={{
        position: "fixed",
        top: "10%",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 2000,
        background: "linear-gradient(45deg, #00E676 30%, #1DE9B6 90%)",
        borderRadius: "20px",
        padding: "20px 40px",
        boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
        animation: `${pulse} 1s infinite`,
      }}
    >
      <Typography variant="h5" sx={{ color: "white", textAlign: "center" }}>
        🎉 {message} 🎉
      </Typography>
    </Box>
  </Slide>
);

// Vitamin Card Component
const VitaminCard = ({ supplement, onConsume, onDelete }) => {
  const remainingPercentage =
    (supplement.quantity / supplement.initialQuantity) * 100;
  const cardColor = getVitaminColor(remainingPercentage);

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -50 }}
      transition={{ duration: 0.5 }}
    >
      <GlowingCard glowColor={cardColor}>
        <CardContent sx={{ p: 4 }}>
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
          >
            <Typography variant="h5" sx={{ fontWeight: 700, color: "#fff" }}>
              {supplement.name}
            </Typography>
            <IconButton
              onClick={() => onDelete(supplement.id)}
              sx={{
                color: "#fff",
                transition: "all 0.3s ease",
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
              Remaining: {supplement.quantity} / {supplement.initialQuantity}
            </Typography>
            <Typography variant="body1" sx={{ color: "#fff", opacity: 0.9 }}>
              Days Left:{" "}
              {Math.floor(supplement.quantity / supplement.dailyUsage)}
            </Typography>
          </Box>

          <Box
            sx={{
              position: "relative",
              height: "6px",
              background: "rgba(255,255,255,0.1)",
              borderRadius: "3px",
              mb: 3,
            }}
          >
            <Box
              sx={{
                position: "absolute",
                left: 0,
                top: 0,
                height: "100%",
                width: `${remainingPercentage}%`,
                background: `linear-gradient(90deg, ${cardColor}, ${alpha(
                  cardColor,
                  0.7
                )})`,
                borderRadius: "3px",
                transition: "width 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
              }}
            />
          </Box>

          <AnimatedButton
            fullWidth
            onClick={() => onConsume(supplement.id)}
            disabled={supplement.quantity <= 0}
            startIcon={<EmojiEventsIcon />}
          >
            Take Daily Dose
          </AnimatedButton>
        </CardContent>
      </GlowingCard>
    </motion.div>
  );
};

// Water Tracking Component
const WaterTracker = ({ user }) => {
  const [waterData, setWaterData] = useState({
    waterIntake: 0,
    dailyWaterTarget: 2000,
    glassSize: 250,
  });
  const [showConfetti, setShowConfetti] = useState(false);
  const [achievement, setAchievement] = useState(null);
  const theme = useTheme();

  // Add this function to get water document reference
  const getWaterDocRef = () => {
    if (!user) return null;
    return doc(db, "users", user.uid, "water", "current");
  };

  const fetchWaterData = async () => {
    if (!user) return;
    try {
      const docSnap = await getDoc(getWaterDocRef());
      if (docSnap.exists()) {
        setWaterData(docSnap.data());
      }
    } catch (error) {
      console.error("Error fetching water data:", error);
    }
  };

  useEffect(() => {
    if (user) fetchWaterData();
  }, [user]);

  const handleAddWater = async () => {
    if (!user) return;
    const newIntake = waterData.waterIntake + waterData.glassSize;
    const isGoalAchieved =
      newIntake >= waterData.dailyWaterTarget &&
      waterData.waterIntake < waterData.dailyWaterTarget;

    try {
      await setDoc(
        getWaterDocRef(),
        {
          waterIntake: newIntake,
          dailyWaterTarget: waterData.dailyWaterTarget,
          glassSize: waterData.glassSize,
        },
        { merge: true }
      );
      await fetchWaterData();
    } catch (error) {
      console.error("Error updating water intake:", error);
    }

    if (isGoalAchieved) {
      setShowConfetti(true);
      setAchievement("Hydration Goal Achieved! 💧");
      setTimeout(() => {
        setShowConfetti(false);
        setAchievement(null);
      }, 5000);
    }
  };

  const handleRemoveWater = async () => {
    const newIntake = Math.max(0, waterData.waterIntake - waterData.glassSize);
    try {
      await setDoc(
        getWaterDocRef(),
        { waterIntake: newIntake },
        { merge: true }
      );
      await fetchWaterData();
    } catch (error) {
      console.error("Error updating water intake:", error);
    }
  };

  const handleWaterSettingChange = async (field, value) => {
    try {
      await setDoc(
        getWaterDocRef(),
        { [field]: Number(value) },
        { merge: true }
      );
      await fetchWaterData();
    } catch (error) {
      console.error("Error updating water settings:", error);
    }
  };

  const fillPercentage = Math.min(
    (waterData.waterIntake / waterData.dailyWaterTarget) * 100,
    100
  );

  return (
    <Box sx={{ position: "relative", mb: 6 }}>
      <Typography
        variant="h4"
        sx={{
          fontWeight: 700,
          color: "#fff",
          mb: 4,
          textAlign: "center",
          textShadow: "2px 2px 4px rgba(0,0,0,0.2)",
        }}
      >
        <FloatingIcon component="span" sx={{ display: "inline-block", mr: 2 }}>
          <OpacityIcon sx={{ fontSize: 40 }} />
        </FloatingIcon>
        Water Tracking
      </Typography>

      <WaterContainer>
        <Box
          sx={{
            position: "absolute",
            bottom: 0,
            left: 0,
            width: "100%",
            height: "100%",
            transition: "transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
            transform: `scaleY(${fillPercentage / 100})`,
            transformOrigin: "bottom",
          }}
        >
          <Lottie
            animationData={waterAnimation}
            loop={true}
            style={{
              width: "auto",
              height: "auto",
              transform: "scaleY(2)",
              transformOrigin: "top",
            }}
          />
        </Box>

        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 2,
            textAlign: "center",
            width: "100%",
            padding: "20px",
          }}
        >
          <Typography
            variant="h2"
            sx={{
              fontWeight: 700,
              color: "#fff",
              textShadow: "2px 2px 4px rgba(0,0,0,0.3)",
              mb: 3,
              animation: `${pulse} 2s infinite`,
            }}
          >
            {waterData.waterIntake} / {waterData.dailyWaterTarget} ml
          </Typography>

          <Box sx={{ display: "flex", justifyContent: "center", gap: 3 }}>
            <Tooltip title="Remove Water" placement="left">
              <IconButton
                onClick={handleRemoveWater}
                sx={{
                  backgroundColor: "rgba(255,255,255,0.2)",
                  backdropFilter: "blur(10px)",
                  "&:hover": {
                    backgroundColor: "rgba(255,255,255,0.3)",
                    transform: "scale(1.1)",
                  },
                  transition: "all 0.3s ease",
                  padding: "15px",
                }}
              >
                <RemoveIcon sx={{ fontSize: 35, color: "#fff" }} />
              </IconButton>
            </Tooltip>

            <Tooltip title="Add Water" placement="right">
              <IconButton
                onClick={handleAddWater}
                sx={{
                  backgroundColor: "rgba(255,255,255,0.2)",
                  backdropFilter: "blur(10px)",
                  "&:hover": {
                    backgroundColor: "rgba(255,255,255,0.3)",
                    transform: "scale(1.1)",
                  },
                  transition: "all 0.3s ease",
                  padding: "15px",
                }}
              >
                <AddIcon sx={{ fontSize: 35, color: "#fff" }} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </WaterContainer>

      <Grid container spacing={3} sx={{ mt: 3 }}>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Glass Size (ml)"
            type="number"
            value={waterData.glassSize}
            onChange={(e) =>
              handleWaterSettingChange("glassSize", e.target.value)
            }
            variant="outlined"
            fullWidth
            sx={{
              "& .MuiOutlinedInput-root": {
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                color: "#fff",
                backdropFilter: "blur(10px)",
                transition: "all 0.3s ease",
                "&:hover": {
                  backgroundColor: "rgba(255, 255, 255, 0.15)",
                },
              },
              "& .MuiInputLabel-root": {
                color: "#fff",
              },
              "& .MuiOutlinedInput-notchedOutline": {
                borderColor: "rgb(255, 255, 255,0.3)",
              },
            }}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Daily Water Goal (ml)"
            type="number"
            value={waterData.dailyWaterTarget}
            onChange={(e) =>
              handleWaterSettingChange("dailyWaterTarget", e.target.value)
            }
            variant="outlined"
            fullWidth
            sx={{
              "& .MuiOutlinedInput-root": {
                backgroundColor: "rgba(255,255,255,0.1)",
                color: "#fff",
                backdropFilter: "blur(10px)",
                transition: "all 0.3s ease",
                "&:hover": {
                  backgroundColor: "rgba(255,255,255,0.15)",
                },
              },
              "& .MuiInputLabel-root": { color: "#fff" },
              "& .MuiOutlinedInput-notchedOutline": {
                borderColor: "rgba(255,255,255,0.3)",
              },
            }}
          />
        </Grid>
      </Grid>

      {showConfetti && (
        <Confetti
          width={window.innerWidth}
          height={window.innerHeight}
          recycle={false}
          numberOfPieces={200}
          gravity={0.3}
        />
      )}

      {achievement && <Achievement message={achievement} />}
    </Box>
  );
};

// Main App Component
const WellnessTracker = ({ user }) => {
  const [supplements, setSupplements] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [newSupplement, setNewSupplement] = useState({
    name: "",
    quantity: 0,
    dailyUsage: 1,
  });

  const getSupplementsRef = () => {
    if (!user) return null;
    return collection(db, "users", user.uid, "supplements");
  };

  const fetchSupplements = async () => {
    if (!user) return;
    try {
      const querySnapshot = await getDocs(getSupplementsRef());
      const supplementsData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setSupplements(supplementsData);
    } catch (error) {
      console.error("Error fetching supplements:", error);
    }
  };

  useEffect(() => {
    if (user) fetchSupplements();
  }, [user]);

  const handleAddSupplement = async () => {
    if (!user) return;
    try {
      await addDoc(getSupplementsRef(), {
        ...newSupplement,
        quantity: Number(newSupplement.quantity),
        initialQuantity: Number(newSupplement.quantity),
        dailyUsage: Number(newSupplement.dailyUsage),
      });
      await fetchSupplements();
      setOpenDialog(false);
      setNewSupplement({ name: "", quantity: 0, dailyUsage: 1 });
    } catch (error) {
      console.error("Error adding supplement:", error);
    }
  };

  const handleConsume = async (id) => {
    if (!user) return;
    try {
      const supplement = supplements.find((supp) => supp.id === id);
      const newQuantity = Math.max(0, supplement.quantity - 1);

      const supplementRef = doc(getSupplementsRef(), id);
      await updateDoc(supplementRef, { quantity: newQuantity });
      await fetchSupplements();
    } catch (error) {
      console.error("Error consuming supplement:", error);
    }
  };

  const handleDelete = async (id) => {
    if (!user) return;
    try {
      const supplementRef = doc(getSupplementsRef(), id);
      await deleteDoc(supplementRef);
      await fetchSupplements();
    } catch (error) {
      console.error("Error deleting supplement:", error);
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
        <Typography
          variant="h2"
          sx={{
            textAlign: "center",
            color: "#fff",
            fontWeight: 800,
            mb: 6,
            textShadow: "2px 2px 4px rgba(0,0,0,0.3)",
            animation: `${float} 3s ease-in-out infinite`,
          }}
        >
          Health Tracker
        </Typography>

        <WaterTracker user={user} />

        <Box sx={{ mb: 4, display: "flex", justifyContent: "flex-end" }}>
          <AnimatedButton
            onClick={() => setOpenDialog(true)}
            startIcon={<AddIcon />}
            sx={{ minWidth: 200 }}
          >
            Add Supplement
          </AnimatedButton>
        </Box>

        <Grid container spacing={4}>
          <AnimatePresence>
            {supplements.map((supplement) => (
              <Grid item xs={12} sm={6} md={4} key={supplement.id}>
                <VitaminCard
                  supplement={supplement}
                  onConsume={handleConsume}
                  onDelete={handleDelete}
                />
              </Grid>
            ))}
          </AnimatePresence>
        </Grid>

        <Dialog
          open={openDialog}
          onClose={() => setOpenDialog(false)}
          PaperProps={{
            sx: {
              background: "rgba(149, 157, 163, 0.83)",
              backdropFilter: "blur(10px)",
              borderRadius: "24px",
              padding: 2,
              border: "1px solid rgba(33, 150, 243, 0.2)",
              color: "rgba(97, 159, 210, 0.1)",
            },
          }}
        >
          <DialogTitle sx={{ color: "rgba(0, 0, 0, 1)", opacity: 0.8 }}>
            Add New Supplement
          </DialogTitle>

          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Supplement Name"
              fullWidth
              value={newSupplement.name}
              onChange={(e) =>
                setNewSupplement({ ...newSupplement, name: e.target.value })
              }
              sx={{ mb: 2 }}
            />
            <TextField
              margin="dense"
              label="Quantity"
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
              label="Daily Usage"
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
            <Button onClick={() => setOpenDialog(false)} color="primary">
              Cancel
            </Button>
            <Button onClick={handleAddSupplement} color="primary">
              Add
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
};

export default WellnessTracker;
