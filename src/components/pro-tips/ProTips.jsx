import React, { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  Grid,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Card,
  CardContent,
  CardActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from "@mui/material";
import { styled, keyframes, alpha } from "@mui/material/styles";
import {
  LocalPharmacy,
  LocalDrink,
  WaterDrop,
  FitnessCenter,
  Restaurant,
  ExpandMore,
  Add,
  Edit,
  Delete,
  Close,
  Search,
} from "@mui/icons-material";
import axios from "axios";
import { toast } from "react-toastify";
import { db } from "../auth/firebaseConfig";
import { doc, updateDoc } from "firebase/firestore";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

// Animasyonlar
const float = keyframes`
  0% { transform: translateY(0px); }
  50% { transform: translateY(-20px); }
  100% { transform: translateY(0px); }
`;

// Yeni tasarım stilleri (WellnessTracker dilinde)

const cardSx = {
  p: 2,
  position: "relative",
  background: "rgba(33, 150, 243, 0.1)",
  backdropFilter: "blur(10px)",
  borderRadius: "24px",
  overflow: "hidden",
  border: "1px solid rgba(33, 150, 243, 0.2)",
  boxShadow: "0 0 20px rgba(33, 150, 243, 0.2)",
  transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
  "&:hover": {
    transform: "translateY(-10px) scale(1.02)",
    boxShadow: "0 0 40px rgba(33, 150, 243, 0.4)",
  },
};

const headerTextShadow = "2px 2px 4px rgba(0,0,0,0.3)";

const inputSx = {
  "& .MuiOutlinedInput-root": {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    color: "#fff",
    backdropFilter: "blur(10px)",
    transition: "all 0.3s ease",
    "&:hover": {
      backgroundColor: "rgba(255,255,255,0.15)",
    },
    // Multiline için height ve min-height ekleyelim
    "&.MuiInputBase-multiline": {
      height: "auto",
    },
  },
  "& .MuiInputLabel-root": { color: "#fff" },
  "& .MuiOutlinedInput-notchedOutline": {
    borderColor: "rgba(255,255,255,0.3)",
  },
  // Text alanı için stil
  "& .MuiInputBase-inputMultiline": {
    height: "auto !important",
    overflow: "auto !important",
  },
};

const accordionSx = {
  background: "rgba(33, 150, 243, 0.1)",
  color: "#fff",
  backdropFilter: "blur(10px)",
  borderRadius: "12px",
  border: "1px solid rgba(33, 150, 243, 0.2)",
  mb: 2,
};

const dialogPaperSx = {
  background: "rgba(33, 150, 243, 0.1)",
  backdropFilter: "blur(10px)",
  borderRadius: "24px",
  border: "1px solid rgba(33, 150, 243, 0.2)",
  color: "#fff",
  p: 2,
};

const TASTY_API_URL = "https://tasty.p.rapidapi.com/recipes/list";

const API_OPTIONS = {
  headers: {
    "X-RapidAPI-Key": import.meta.env.VITE_XRAPID_API_KEY,
    "X-RapidAPI-Host": "tasty.p.rapidapi.com",
  },
  params: { from: "0", size: "6", q: " " },
  timeout: 10000,
};

const ProTips = ({ additionalInfo, setAdditionalInfo, user }) => {
  const [openModal, setOpenModal] = useState(false);
  const [openTastyModal, setOpenTastyModal] = useState(false);
  const [modalType, setModalType] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tastyRecipes, setTastyRecipes] = useState([]);
  const [searchQuery, setSearchQuery] = useState("Tarif Ara");
  const [editData, setEditData] = useState({
    index: null,
    groupIndex: null,
    data: {},
  });
  const [selectedTag, setSelectedTag] = useState(""); // Yeni: kategori/etiket seçimi
  const TAG_OPTIONS = [
    { value: "", label: "Tümü" },
    { value: "vegan", label: "Vegan" },
    { value: "vegetarian", label: "Vejetaryen" },
    { value: "dessert", label: "Tatlı" },
    { value: "breakfast", label: "Kahvaltı" },
    { value: "dinner", label: "Akşam Yemeği" },
    { value: "gluten-free", label: "Glutensiz" },
    { value: "low-carb", label: "Düşük Karbonhidrat" },
    { value: "low-fat", label: "Düşük Yağ" },
    { value: "low-sugar", label: "Düşük Şeker" },
    { value: "high-protein", label: "Yüksek Protein" },
    { value: "quick", label: "Hızlı" },
    { value: "easy", label: "Kolay" },
    { value: "healthy", label: "Sağlıklı" },
    { value: "comfort-food", label: "Rahat Yemek" },
  ];

  const fetchTastyRecipes = async () => {
    if (!searchQuery.trim()) {
      toast.info("Lütfen arama terimi giriniz");
      return;
    }
    try {
      setLoading(true);
      setError("");
      // Rastgele offset oluşturuyoruz (örneğin 0 ile 100 arasında)
      const randomOffset = Math.floor(Math.random() * 100);
      const params = {
        from: randomOffset,
        size: 6,
        q: searchQuery,
      };
      // Eğer kullanıcı bir kategori/etiket seçtiyse bunu ekle
      if (selectedTag.trim()) {
        params.tags = selectedTag;
      }
      const response = await axios.get(TASTY_API_URL, {
        headers: {
          "X-RapidAPI-Key": import.meta.env.VITE_XRAPID_API_KEY,
          "X-RapidAPI-Host": "tasty.p.rapidapi.com",
        },
        params,
        timeout: 10000,
      });
      setTastyRecipes(response.data.results || []);
    } catch (err) {
      setError(err.message || "Tarifler yüklenirken hata oluştu");
      toast.error("Tarif verileri alınamadı");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTastyRecipes();
  }, []);

  const handleSaveToFirebase = async (updatedData) => {
    if (!user) return;
    try {
      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, { additionalInfo: updatedData });
      toast.success("Değişiklikler kaydedildi!");
    } catch (error) {
      toast.error("Veri kaydedilirken hata oluştu");
    }
  };

  const handleAddItem = (section, data, groupIndex = null) => {
    const updated = JSON.parse(JSON.stringify(additionalInfo));
    if (section === "recipes") {
      const newData = { ...data, id: Date.now().toString() };
      updated[section] = [...(updated[section] || []), newData];
    } else if (section === "supplementDetails") {
      updated.supplementDetails[data.key] = {
        title: data.title,
        groups: data.groups || [],
        items: data.items || [],
      };
    } else if (section.startsWith("supplementDetails.")) {
      const [mainSection, subSection] = section.split(".");
      const target = updated[mainSection][subSection];
      if (groupIndex !== null && target.groups) {
        target.groups[groupIndex].items.push(data);
      } else {
        target.items = [...(target.items || []), data];
      }
    } else {
      updated[section].items.push(data);
    }
    setAdditionalInfo(updated);
    handleSaveToFirebase(updated);
    setOpenModal(false);
  };

  const handleEditItem = (section, index, data, groupIndex = null) => {
    const updated = JSON.parse(JSON.stringify(additionalInfo));
    if (section === "recipes") {
      updated[section][index] = data;
    } else if (section === "supplementDetails") {
      updated.supplementDetails[data.key].title = data.title;
    } else if (section.startsWith("supplementDetails.")) {
      const [mainSection, subSection] = section.split(".");
      if (groupIndex !== null) {
        updated[mainSection][subSection].groups[groupIndex].items[index] = data;
      } else {
        updated[mainSection][subSection].items[index] = data;
      }
    } else {
      updated[section].items[index] = data;
    }
    setAdditionalInfo(updated);
    handleSaveToFirebase(updated);
    setOpenModal(false);
  };

  const handleDeleteItem = (section, identifier, groupIndex = null) => {
    const updated = JSON.parse(JSON.stringify(additionalInfo));
    if (section === "recipes") {
      updated[section].splice(identifier, 1);
    } else if (section === "supplementDetails") {
      delete updated.supplementDetails[identifier];
    } else if (section.startsWith("supplementDetails.")) {
      const [mainSection, subSection] = section.split(".");
      if (groupIndex !== null) {
        updated[mainSection][subSection].groups[groupIndex].items.splice(
          identifier,
          1
        );
      } else {
        updated[mainSection][subSection].items.splice(identifier, 1);
      }
    } else {
      updated[section].items.splice(identifier, 1);
    }
    setAdditionalInfo(updated);
    handleSaveToFirebase(updated);
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const supplementGroups = Object.entries(additionalInfo.supplementDetails)
      .filter(([key]) => key !== "importantNotes")
      .map(([key, value]) => ({ key, ...value }));
    const items = Array.from(supplementGroups);
    const [removed] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, removed);

    const newSupplementDetails = items.reduce((acc, item) => {
      acc[item.key] = item;
      return acc;
    }, {});

    if (additionalInfo.supplementDetails.importantNotes) {
      newSupplementDetails.importantNotes =
        additionalInfo.supplementDetails.importantNotes;
    }

    const updated = {
      ...additionalInfo,
      supplementDetails: newSupplementDetails,
    };
    setAdditionalInfo(updated);
    handleSaveToFirebase(updated);
  };

  const renderTastyModal = () => (
    <Dialog
      open={openTastyModal}
      onClose={() => setOpenTastyModal(false)}
      fullWidth
      maxWidth="md"
      PaperProps={{ sx: dialogPaperSx }}
    >
      <DialogTitle>
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          height={60}
        >
          Tarif Ara (Tasty)
          <IconButton onClick={() => setOpenTastyModal(false)}>
            <Close sx={{ color: "#fff" }} />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        {/* Arama ve Kategori Bölümü */}
        <Box sx={{ mb: 4 }}>
          {/* Arama Alanı */}
          <Box
            sx={{
              mb: 2,
              marginTop: 2,
            }}
          >
            <TextField
              fullWidth
              variant="outlined"
              label="Tarif Ara"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={inputSx}
            />
          </Box>

          {/* Kategori Seçimi */}
          <Box sx={{ mb: 2 }}>
            <FormControl fullWidth>
              <InputLabel sx={{ color: "#fff" }}>Kategori</InputLabel>
              <Select
                value={selectedTag}
                onChange={(e) => setSelectedTag(e.target.value)}
                sx={{
                  ...inputSx,
                  backgroundColor: "rgba(255,255,255,0.1)",
                  color: "#fff",
                  "& .MuiSelect-icon": {
                    color: "#fff",
                  },
                }}
              >
                {TAG_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {/* Arama Butonu */}
          <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
            <Button
              variant="contained"
              onClick={fetchTastyRecipes}
              sx={{
                minWidth: "120px",
                height: "40px",
              }}
            >
              Ara
            </Button>
          </Box>
        </Box>

        {/* Yükleniyor ve Hata Durumları */}
        {loading && (
          <Box sx={{ display: "flex", justifyContent: "center", my: 3 }}>
            <CircularProgress sx={{ color: "#fff" }} />
          </Box>
        )}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Tarif Sonuçları */}
        <Grid container spacing={3}>
          {tastyRecipes.slice(0, 6).map((recipe) => (
            <Grid item xs={12} md={6} key={recipe.id}>
              <Card sx={cardSx}>
                <CardContent>
                  <Typography variant="h6" sx={{ color: "#fff" }}>
                    {recipe.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {recipe.description}
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => {
                      const newRecipe = {
                        title: recipe.name,
                        ingredients:
                          recipe.sections?.[0]?.components?.map(
                            (c) => c.raw_text
                          ) || [],
                        preparation:
                          recipe.instructions?.map((i) => i.display_text) || [],
                      };
                      handleAddItem("recipes", newRecipe);
                      setOpenTastyModal(false);
                    }}
                  >
                    Ekle
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      </DialogContent>
    </Dialog>
  );

  const renderModalContent = () => {
    switch (modalType) {
      case "liquid":
      case "activity":
        return (
          <>
            <TextField
              label="Öğe Adı"
              fullWidth
              value={editData.data.name || ""}
              onChange={(e) =>
                setEditData({
                  ...editData,
                  data: { ...editData.data, name: e.target.value },
                })
              }
              sx={{ mb: 2, ...inputSx }}
            />
            <TextField
              label="Değer"
              fullWidth
              value={editData.data.value || ""}
              onChange={(e) =>
                setEditData({
                  ...editData,
                  data: { ...editData.data, value: e.target.value },
                })
              }
              sx={inputSx}
            />
          </>
        );
      case "recipe":
        return (
          <>
            <TextField
              label="Tarif Adı"
              fullWidth
              value={editData.data.title || ""}
              onChange={(e) =>
                setEditData({
                  ...editData,
                  data: { ...editData.data, title: e.target.value },
                })
              }
              sx={{ mb: 2, ...inputSx }}
            />
            <TextField
              label="Malzemeler (her satıra bir malzeme)"
              fullWidth
              multiline
              rows={6}
              value={editData.data.ingredients?.join("\n") || ""}
              onChange={(e) =>
                setEditData({
                  ...editData,
                  data: {
                    ...editData.data,
                    ingredients: e.target.value
                      .split("\n")
                      .filter((ing) => ing.trim() !== ""),
                  },
                })
              }
              sx={{ mb: 2, ...inputSx }}
            />
            <TextField
              label="Hazırlanış (her satıra bir adım)"
              fullWidth
              multiline
              rows={6}
              value={editData.data.preparation?.join("\n") || ""}
              onChange={(e) =>
                setEditData({
                  ...editData,
                  data: {
                    ...editData.data,
                    preparation: e.target.value
                      .split("\n")
                      .filter((step) => step.trim() !== ""),
                  },
                })
              }
              sx={inputSx}
            />
          </>
        );
      case "supplement":
        return (
          <>
            <TextField
              label="Öğe Adı"
              fullWidth
              value={editData.data.name || ""}
              onChange={(e) =>
                setEditData({
                  ...editData,
                  data: { ...editData.data, name: e.target.value },
                })
              }
              sx={{ mb: 2, ...inputSx }}
            />
            <TextField
              label="Miktar"
              fullWidth
              value={editData.data.amount || ""}
              onChange={(e) =>
                setEditData({
                  ...editData,
                  data: { ...editData.data, amount: e.target.value },
                })
              }
              sx={{ mb: 2, ...inputSx }}
            />
            <TextField
              label="Günlük Değer"
              fullWidth
              value={editData.data.dailyValue || ""}
              onChange={(e) =>
                setEditData({
                  ...editData,
                  data: { ...editData.data, dailyValue: e.target.value },
                })
              }
              sx={inputSx}
            />
          </>
        );
      case "supplementMain":
        return (
          <>
            <TextField
              label="Takviye Başlığı"
              fullWidth
              value={editData.data.title || ""}
              onChange={(e) =>
                setEditData({
                  ...editData,
                  data: { ...editData.data, title: e.target.value },
                })
              }
              sx={inputSx}
            />
          </>
        );
      case "supplementMainAdd":
        return (
          <>
            <TextField
              label="Yeni Takviye Grubu Anahtar (benzersiz)"
              fullWidth
              value={editData.data.key || ""}
              onChange={(e) =>
                setEditData({
                  ...editData,
                  data: { ...editData.data, key: e.target.value },
                })
              }
              sx={{ mb: 2, ...inputSx }}
            />
            <TextField
              label="Takviye Başlığı"
              fullWidth
              value={editData.data.title || ""}
              onChange={(e) =>
                setEditData({
                  ...editData,
                  data: { ...editData.data, title: e.target.value },
                })
              }
              sx={inputSx}
            />
          </>
        );
      case "note":
        return (
          <>
            <TextField
              label="Not"
              fullWidth
              value={editData.data || ""}
              onChange={(e) =>
                setEditData({ ...editData, data: e.target.value })
              }
              sx={inputSx}
            />
          </>
        );
      default:
        return null;
    }
  };

  const supplementGroups = Object.entries(
    additionalInfo.supplementDetails || {}
  )
    .filter(([key]) => key !== "importantNotes")
    .map(([key, value]) => ({ key, ...value }));

  return (
    <Paper
      sx={{
        p: 3,
        borderRadius: 2,
        background:
          "linear-gradient(135deg, #1a2a6c 0%, #2196F3 50%, #3F51B5 100%)",
        minHeight: "100vh",
        color: "#fff",
      }}
    >
      {openTastyModal && renderTastyModal()}
      <Dialog
        open={openModal}
        onClose={() => setOpenModal(false)}
        fullWidth
        maxWidth="md"
        PaperProps={{ sx: dialogPaperSx }}
        onClick={(e) => e.stopPropagation()}
      >
        <DialogTitle>
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
          >
            {editData.index !== null || modalType === "supplementMain"
              ? "Öğeyi Düzenle"
              : "Yeni Öğeyi Ekle"}
            <IconButton onClick={() => setOpenModal(false)}>
              <Close sx={{ color: "#fff" }} />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box mt={2}>
            {renderModalContent()}
            <Box mt={3} display="flex" justifyContent="flex-end" gap={2}>
              <Button variant="outlined" onClick={() => setOpenModal(false)}>
                İptal
              </Button>
              <Button
                variant="contained"
                onClick={() => {
                  if (modalType === "supplementMain") {
                    handleEditItem(
                      "supplementDetails",
                      editData.data.key,
                      editData.data
                    );
                  } else if (modalType === "supplementMainAdd") {
                    handleAddItem("supplementDetails", editData.data);
                  } else if (editData.index !== null) {
                    handleEditItem(
                      selectedSection,
                      editData.index,
                      editData.data,
                      editData.groupIndex
                    );
                  } else {
                    handleAddItem(
                      selectedSection,
                      editData.data,
                      editData.groupIndex
                    );
                  }
                }}
              >
                {editData.index !== null || modalType === "supplementMain"
                  ? "Güncelle"
                  : "Kaydet"}
              </Button>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
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
          <LocalDrink sx={{ fontSize: 50, verticalAlign: "middle", mr: 2 }} />
          Pro Öneriler
        </Typography>
      </Box>
      <Accordion sx={accordionSx}>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            width="100%"
          >
            <Typography variant="h6" sx={{ color: "#fff" }}>
              <WaterDrop sx={{ color: "#fff" }} /> Sıvı Tüketim Hedefleri
            </Typography>
            <IconButton
              onClick={(e) => {
                e.stopPropagation();
                setSelectedSection("liquidConsumptionGoals");
                setModalType("liquid");
                setEditData({ index: null, data: {} });
                setOpenModal(true);
              }}
            >
              <Add sx={{ color: "#fff" }} />
            </IconButton>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            {(additionalInfo.liquidConsumptionGoals?.items || []).map(
              (item, index) => (
                <Grid item xs={12} sm={6} md={4} key={index}>
                  <Paper sx={cardSx}>
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="subtitle1" sx={{ color: "#fff" }}>
                        {item.name}
                      </Typography>
                      <Box>
                        <IconButton
                          onClick={() => {
                            setSelectedSection("liquidConsumptionGoals");
                            setModalType("liquid");
                            setEditData({ index, data: item });
                            setOpenModal(true);
                          }}
                          size="small"
                        >
                          <Edit sx={{ color: "#fff" }} fontSize="small" />
                        </IconButton>
                        <IconButton
                          onClick={() =>
                            handleDeleteItem("liquidConsumptionGoals", index)
                          }
                          size="small"
                        >
                          <Delete sx={{ color: "#fff" }} fontSize="small" />
                        </IconButton>
                      </Box>
                    </Box>
                    <Chip label={item.value} color="primary" sx={{ mt: 1 }} />
                  </Paper>
                </Grid>
              )
            )}
          </Grid>
        </AccordionDetails>
      </Accordion>
      <Accordion sx={accordionSx}>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            width="100%"
          >
            <Typography variant="h6" sx={{ color: "#fff" }}>
              <FitnessCenter sx={{ color: "#fff" }} /> Günlük Aktivite Hedefleri
            </Typography>
            <IconButton
              onClick={(e) => {
                e.stopPropagation();
                setSelectedSection("dailyActivityGoals");
                setModalType("activity");
                setEditData({ index: null, data: {} });
                setOpenModal(true);
              }}
            >
              <Add sx={{ color: "#fff" }} />
            </IconButton>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            {(additionalInfo.dailyActivityGoals?.items || []).map(
              (item, index) => (
                <Grid item xs={12} sm={6} md={4} key={index}>
                  <Paper sx={cardSx}>
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="subtitle1" sx={{ color: "#fff" }}>
                        {item.name}
                      </Typography>
                      <Box>
                        <IconButton
                          onClick={() => {
                            setSelectedSection("dailyActivityGoals");
                            setModalType("activity");
                            setEditData({ index, data: item });
                            setOpenModal(true);
                          }}
                          size="small"
                        >
                          <Edit sx={{ color: "#fff" }} fontSize="small" />
                        </IconButton>
                        <IconButton
                          onClick={() =>
                            handleDeleteItem("dailyActivityGoals", index)
                          }
                          size="small"
                        >
                          <Delete sx={{ color: "#fff" }} fontSize="small" />
                        </IconButton>
                      </Box>
                    </Box>
                    <Chip label={item.value} color="secondary" sx={{ mt: 1 }} />
                  </Paper>
                </Grid>
              )
            )}
          </Grid>
        </AccordionDetails>
      </Accordion>
      <Accordion sx={accordionSx}>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            width="100%"
          >
            <Typography variant="h6" sx={{ color: "#fff" }}>
              <Restaurant sx={{ color: "#fff" }} /> Tarifler
            </Typography>
            <Box>
              <IconButton
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedSection("recipes");
                  setModalType("recipe");
                  setEditData({ index: null, data: {} });
                  setOpenModal(true);
                }}
              >
                <Add sx={{ color: "#fff" }} />
              </IconButton>
              <IconButton
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenTastyModal(true);
                }}
              >
                <Search sx={{ color: "#fff" }} />
              </IconButton>
            </Box>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ mt: 2 }}>
            {(additionalInfo.recipes || []).map((recipe, index) => (
              <Accordion
                key={recipe.id || index}
                sx={{
                  ...accordionSx,
                  mb: 2,
                  "&:last-child": { mb: 0 },
                  backgroundColor: "rgba(33, 150, 243, 0.05)",
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMore sx={{ color: "#fff" }} />}
                  sx={{
                    "&:hover": {
                      backgroundColor: "rgba(33, 150, 243, 0.1)",
                    },
                  }}
                >
                  <Box
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                    width="100%"
                    pr={2}
                  >
                    <Typography variant="h6" sx={{ color: "#fff" }}>
                      {recipe.title}
                    </Typography>
                    <Box>
                      <IconButton
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSection("recipes");
                          setModalType("recipe");
                          setEditData({ index, data: recipe });
                          setOpenModal(true);
                        }}
                        size="small"
                      >
                        <Edit sx={{ color: "#fff" }} fontSize="small" />
                      </IconButton>
                      <IconButton
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteItem("recipes", index);
                        }}
                        size="small"
                      >
                        <Delete sx={{ color: "#fff" }} fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ p: 2 }}>
                    {/* Malzemeler Bölümü */}
                    <Typography
                      variant="subtitle1"
                      sx={{
                        color: "#fff",
                        fontWeight: "bold",
                        mb: 2,
                      }}
                    >
                      Malzemeler:
                    </Typography>
                    <Box sx={{ mb: 3 }}>
                      {recipe.ingredients?.map((ing, i) => (
                        <Typography
                          key={i}
                          variant="body1"
                          sx={{
                            color: "#fff",
                            mb: 1,
                            display: "flex",
                            alignItems: "center",
                            "&:before": {
                              content: '"•"',
                              mr: 2,
                              color: "#2196F3",
                            },
                          }}
                        >
                          {ing}
                        </Typography>
                      ))}
                    </Box>

                    {/* Hazırlanış Bölümü */}
                    {recipe.preparation && recipe.preparation.length > 0 && (
                      <>
                        <Typography
                          variant="subtitle1"
                          sx={{
                            color: "#fff",
                            fontWeight: "bold",
                            mb: 2,
                          }}
                        >
                          Hazırlanış:
                        </Typography>
                        <Box>
                          {recipe.preparation?.map((step, i) => (
                            <Box
                              key={i}
                              sx={{
                                display: "flex",
                                mb: 2,
                                "&:last-child": { mb: 0 },
                              }}
                            >
                              <Typography
                                sx={{
                                  color: "#2196F3",
                                  mr: 2,
                                  fontWeight: "bold",
                                  minWidth: "24px",
                                }}
                              >
                                {i + 1}.
                              </Typography>
                              <Typography sx={{ color: "#fff" }}>
                                {step}
                              </Typography>
                            </Box>
                          ))}
                        </Box>
                      </>
                    )}
                  </Box>
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        </AccordionDetails>
      </Accordion>
      <Accordion sx={accordionSx}>
        <AccordionSummary expandIcon={<ExpandMore />} component="div">
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            width="100%"
          >
            <Typography variant="h6" sx={{ color: "#fff" }}>
              <LocalPharmacy color="primary" /> Takviye Grupları
            </Typography>
            <IconButton
              onClick={(e) => {
                e.stopPropagation();
                setSelectedSection("supplementDetails");
                setModalType("supplementMainAdd");
                setEditData({ index: null, data: {} });
                setOpenModal(true);
              }}
            >
              <Add sx={{ color: "#fff" }} />
            </IconButton>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="supplementGroups">
              {(provided) => (
                <Box ref={provided.innerRef} {...provided.droppableProps}>
                  {supplementGroups.map((group, index) => (
                    <Draggable
                      key={group.key}
                      draggableId={group.key}
                      index={index}
                    >
                      {(provided) => (
                        <Box
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          sx={{ mb: 2 }}
                        >
                          <Accordion sx={accordionSx}>
                            <AccordionSummary
                              expandIcon={<ExpandMore />}
                              component="div"
                            >
                              <Box
                                display="flex"
                                justifyContent="space-between"
                                alignItems="center"
                                width="100%"
                              >
                                <Typography
                                  variant="h6"
                                  sx={{ p: 1, color: "#fff" }}
                                >
                                  {group.title}
                                </Typography>
                                <Box>
                                  <IconButton
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedSection("supplementDetails");
                                      setModalType("supplementMain");
                                      setEditData({
                                        index: group.key,
                                        data: {
                                          key: group.key,
                                          title: group.title,
                                        },
                                      });
                                      setOpenModal(true);
                                    }}
                                    size="small"
                                  >
                                    <Edit
                                      sx={{ color: "#fff" }}
                                      fontSize="small"
                                    />
                                  </IconButton>
                                  <IconButton
                                    onClick={() =>
                                      handleDeleteItem(
                                        "supplementDetails",
                                        group.key
                                      )
                                    }
                                    size="small"
                                  >
                                    <Delete
                                      sx={{ color: "#fff" }}
                                      fontSize="small"
                                    />
                                  </IconButton>
                                </Box>
                              </Box>
                            </AccordionSummary>
                            <AccordionDetails>
                              {group.groups && group.groups.length > 0 ? (
                                group.groups.map((subGroup, subIndex) => (
                                  <Box key={subIndex} mb={3}>
                                    <Typography
                                      variant="subtitle2"
                                      fontWeight="bold"
                                      sx={{ color: "#fff" }}
                                    >
                                      {subGroup.heading}
                                    </Typography>
                                    <Grid container spacing={2}>
                                      {(subGroup.items || []).map(
                                        (item, idx) => (
                                          <Grid
                                            item
                                            xs={12}
                                            sm={6}
                                            md={4}
                                            key={idx}
                                          >
                                            <Card sx={cardSx}>
                                              <CardContent>
                                                <Typography
                                                  variant="body1"
                                                  sx={{ color: "#fff" }}
                                                >
                                                  {item.name}
                                                </Typography>
                                                <Typography
                                                  variant="body2"
                                                  color="text.secondary"
                                                >
                                                  {item.amount}{" "}
                                                  {item.dailyValue &&
                                                    `(${item.dailyValue})`}
                                                </Typography>
                                              </CardContent>
                                              <CardActions>
                                                <IconButton
                                                  onClick={() => {
                                                    setSelectedSection(
                                                      `supplementDetails.${group.key}`
                                                    );
                                                    setModalType("supplement");
                                                    setEditData({
                                                      index: idx,
                                                      groupIndex: subIndex,
                                                      data: item,
                                                    });
                                                    setOpenModal(true);
                                                  }}
                                                  size="small"
                                                >
                                                  <Edit
                                                    sx={{ color: "#fff" }}
                                                    fontSize="small"
                                                  />
                                                </IconButton>
                                                <IconButton
                                                  onClick={() =>
                                                    handleDeleteItem(
                                                      `supplementDetails.${group.key}`,
                                                      idx,
                                                      subIndex
                                                    )
                                                  }
                                                  size="small"
                                                >
                                                  <Delete
                                                    sx={{ color: "#fff" }}
                                                    fontSize="small"
                                                  />
                                                </IconButton>
                                              </CardActions>
                                            </Card>
                                          </Grid>
                                        )
                                      )}
                                      <Grid item xs={12} sm={6} md={4}>
                                        <Card
                                          sx={{
                                            ...cardSx,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            cursor: "pointer",
                                          }}
                                          onClick={() => {
                                            setSelectedSection(
                                              `supplementDetails.${group.key}`
                                            );
                                            setModalType("supplement");
                                            setEditData({
                                              index: null,
                                              groupIndex: subIndex,
                                              data: {},
                                            });
                                            setOpenModal(true);
                                          }}
                                        >
                                          <CardContent>
                                            <Typography
                                              variant="h6"
                                              align="center"
                                            >
                                              +
                                            </Typography>
                                          </CardContent>
                                        </Card>
                                      </Grid>
                                    </Grid>
                                  </Box>
                                ))
                              ) : (
                                <Grid container spacing={2}>
                                  {(group.items || []).map((item, idx) => (
                                    <Grid item xs={12} sm={6} md={4} key={idx}>
                                      <Card sx={cardSx}>
                                        <CardContent>
                                          <Typography
                                            variant="body1"
                                            sx={{ color: "#fff" }}
                                          >
                                            {item.name}
                                          </Typography>
                                          <Typography
                                            variant="body2"
                                            color="text.secondary"
                                          >
                                            {item.amount}{" "}
                                            {item.dailyValue &&
                                              `(${item.dailyValue})`}
                                          </Typography>
                                        </CardContent>
                                        <CardActions>
                                          <IconButton
                                            onClick={() => {
                                              setSelectedSection(
                                                `supplementDetails.${group.key}`
                                              );
                                              setModalType("supplement");
                                              setEditData({
                                                index: idx,
                                                data: item,
                                              });
                                              setOpenModal(true);
                                            }}
                                            size="small"
                                          >
                                            <Edit
                                              sx={{ color: "#fff" }}
                                              fontSize="small"
                                            />
                                          </IconButton>
                                          <IconButton
                                            onClick={() =>
                                              handleDeleteItem(
                                                `supplementDetails.${group.key}`,
                                                idx
                                              )
                                            }
                                            size="small"
                                          >
                                            <Delete
                                              sx={{ color: "#fff" }}
                                              fontSize="small"
                                            />
                                          </IconButton>
                                        </CardActions>
                                      </Card>
                                    </Grid>
                                  ))}
                                  <Grid item xs={12} sm={6} md={4}>
                                    <Card
                                      sx={{
                                        ...cardSx,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        cursor: "pointer",
                                      }}
                                      onClick={() => {
                                        setSelectedSection(
                                          `supplementDetails.${group.key}`
                                        );
                                        setModalType("supplement");
                                        setEditData({ index: null, data: {} });
                                        setOpenModal(true);
                                      }}
                                    >
                                      <CardContent>
                                        <Typography variant="h6" align="center">
                                          +
                                        </Typography>
                                      </CardContent>
                                    </Card>
                                  </Grid>
                                </Grid>
                              )}
                            </AccordionDetails>
                          </Accordion>
                        </Box>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </Box>
              )}
            </Droppable>
          </DragDropContext>
        </AccordionDetails>
      </Accordion>
      {additionalInfo.supplementDetails?.importantNotes && (
        <Accordion sx={accordionSx}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              width="100%"
            >
              <Typography variant="h6" sx={{ color: "#fff" }}>
                <LocalPharmacy color="primary" /> Önemli Notlar
              </Typography>
              <IconButton
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedSection("supplementDetails.importantNotes");
                  setModalType("note");
                  setEditData({ index: null, data: {} });
                  setOpenModal(true);
                }}
              >
                <Add sx={{ color: "#fff" }} />
              </IconButton>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              {(
                additionalInfo.supplementDetails.importantNotes.items || []
              ).map((note, index) => (
                <Grid item xs={12} sm={6} md={4} key={index}>
                  <Card sx={cardSx}>
                    <CardContent>
                      <Typography variant="body1" sx={{ color: "#fff" }}>
                        {note}
                      </Typography>
                    </CardContent>
                    <CardActions>
                      <IconButton
                        onClick={() => {
                          setSelectedSection(
                            "supplementDetails.importantNotes"
                          );
                          setModalType("note");
                          setEditData({ index, data: note });
                          setOpenModal(true);
                        }}
                        size="small"
                      >
                        <Edit sx={{ color: "#fff" }} fontSize="small" />
                      </IconButton>
                      <IconButton
                        onClick={() =>
                          handleDeleteItem(
                            "supplementDetails.importantNotes",
                            index
                          )
                        }
                        size="small"
                      >
                        <Delete sx={{ color: "#fff" }} fontSize="small" />
                      </IconButton>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </AccordionDetails>
        </Accordion>
      )}
    </Paper>
  );
};

export default ProTips;
