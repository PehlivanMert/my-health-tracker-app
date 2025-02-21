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
} from "@mui/material";
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
} from "@mui/icons-material";
import axios from "axios";
import { toast } from "react-toastify";
import { db } from "../auth/firebaseConfig";
import { doc, updateDoc } from "firebase/firestore";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

const ProTips = ({ additionalInfo, setAdditionalInfo, user }) => {
  const [openModal, setOpenModal] = useState(false);
  const [openTastyModal, setOpenTastyModal] = useState(false);
  const [modalType, setModalType] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tastyRecipes, setTastyRecipes] = useState([]);
  const [searchQuery, setSearchQuery] = useState("vegatables");
  const [editData, setEditData] = useState({
    index: null,
    groupIndex: null,
    data: {},
  });

  const cardSx = {
    p: 2,
    position: "relative",
    background: "linear-gradient(135deg, #f5f5f5 0%, #fff8e7 100%)",
    transition: "transform 0.2s, box-shadow 0.2s, background 0.2s",
    "&:hover": {
      transform: "scale(1.02)",
      boxShadow: "0 4px 20px rgba(0, 0, 0, 0.2)",
      background:
        "linear-gradient(135deg, #f5f5f5 0%, #fff8e7 50%, #f0e6d2 100%)",
    },
  };

  const TASTY_API_URL = "https://tasty.p.rapidapi.com/recipes/list";
  const API_OPTIONS = {
    headers: {
      "X-RapidAPI-Key": import.meta.env.VITE_XRAPID_API_KEY,
      "X-RapidAPI-Host": "tasty.p.rapidapi.com",
    },
    params: { from: "0", size: "6", q: searchQuery },
    timeout: 10000,
  };

  const fetchTastyRecipes = async () => {
    if (!searchQuery.trim()) {
      toast.info("Lütfen arama terimi giriniz");
      return;
    }
    try {
      setLoading(true);
      setError("");
      const response = await axios.get(TASTY_API_URL, API_OPTIONS);
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
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box mb={2}>
          <TextField
            fullWidth
            variant="outlined"
            label="Tarif Ara"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Box mt={1} textAlign="right">
            <Button variant="contained" onClick={fetchTastyRecipes}>
              Ara
            </Button>
          </Box>
        </Box>
        {loading && <CircularProgress sx={{ my: 2 }} />}
        {error && <Alert severity="error">{error}</Alert>}
        <Grid container spacing={3}>
          {tastyRecipes.slice(0, 6).map((recipe) => (
            <Grid item xs={12} md={6} key={recipe.id}>
              <Card sx={cardSx}>
                <CardContent>
                  <Typography variant="h6">{recipe.name}</Typography>
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
              sx={{ mb: 2 }}
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
              sx={{ mb: 2 }}
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
              sx={{ mb: 2 }}
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
              sx={{ mb: 2 }}
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
              sx={{ mb: 2 }}
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
              sx={{ mb: 2 }}
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
        background: "linear-gradient(135deg, #f0f8ff 0%, #e6f7ff 100%)",
      }}
    >
      {openTastyModal && renderTastyModal()}

      <Dialog
        open={openModal}
        onClose={() => setOpenModal(false)}
        fullWidth
        maxWidth="md"
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
              <Close />
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
        <Typography variant="h5" display="flex" alignItems="center" gap={1}>
          <LocalDrink /> Pro Öneriler
        </Typography>
      </Box>

      <Accordion>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            width="100%"
          >
            <Typography variant="h6">
              <WaterDrop color="primary" /> Sıvı Tüketim Hedefleri
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
              <Add color="primary" />
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
                      <Typography variant="subtitle1">{item.name}</Typography>
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
                          <Edit fontSize="small" />
                        </IconButton>
                        <IconButton
                          onClick={() =>
                            handleDeleteItem("liquidConsumptionGoals", index)
                          }
                          size="small"
                        >
                          <Delete fontSize="small" />
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

      <Accordion sx={{ mt: 2 }}>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            width="100%"
          >
            <Typography variant="h6">
              <FitnessCenter color="primary" /> Günlük Aktivite Hedefleri
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
              <Add color="primary" />
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
                      <Typography variant="subtitle1">{item.name}</Typography>
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
                          <Edit fontSize="small" />
                        </IconButton>
                        <IconButton
                          onClick={() =>
                            handleDeleteItem("dailyActivityGoals", index)
                          }
                          size="small"
                        >
                          <Delete fontSize="small" />
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

      <Accordion sx={{ mt: 2 }}>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            width="100%"
          >
            <Typography variant="h6">
              <Restaurant color="primary" /> Tarifler
            </Typography>
            <IconButton
              onClick={(e) => {
                e.stopPropagation();
                setSelectedSection("recipes");
                setModalType("recipe");
                setEditData({ index: null, data: {} });
                setOpenModal(true);
              }}
            >
              <Add color="primary" />
            </IconButton>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            {(additionalInfo.recipes || []).map((recipe, index) => (
              <Grid item xs={12} md={6} key={recipe.id || index}>
                <Card sx={cardSx}>
                  <CardContent>
                    <Typography variant="h6">{recipe.title}</Typography>
                    <Box mt={1}>
                      <Typography variant="subtitle2">Malzemeler:</Typography>
                      <ul style={{ paddingLeft: 20, margin: 0 }}>
                        {recipe.ingredients?.map((ing, i) => (
                          <li key={i}>
                            <Typography variant="body2">{ing}</Typography>
                          </li>
                        ))}
                      </ul>
                    </Box>
                    {recipe.preparation && (
                      <Box mt={1}>
                        <Typography variant="subtitle2">Hazırlanış:</Typography>
                        <ol style={{ paddingLeft: 20, margin: 0 }}>
                          {recipe.preparation?.map((step, i) => (
                            <li key={i}>
                              <Typography variant="body2">{step}</Typography>
                            </li>
                          ))}
                        </ol>
                      </Box>
                    )}
                  </CardContent>
                  <CardActions>
                    <IconButton
                      onClick={() => {
                        setSelectedSection("recipes");
                        setModalType("recipe");
                        setEditData({ index, data: recipe });
                        setOpenModal(true);
                      }}
                      size="small"
                    >
                      <Edit fontSize="small" />
                    </IconButton>
                    <IconButton
                      onClick={() => handleDeleteItem("recipes", index)}
                      size="small"
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
          <Box mt={2} textAlign="center">
            <Button variant="contained" onClick={() => setOpenTastyModal(true)}>
              Tasty Tarif Ara
            </Button>
          </Box>
        </AccordionDetails>
      </Accordion>

      <Accordion sx={{ mt: 2 }}>
        <AccordionSummary expandIcon={<ExpandMore />} component="div">
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            width="100%"
          >
            <Typography variant="h6">
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
              <Add color="primary" />
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
                          <Accordion>
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
                                <Typography variant="h6" sx={{ p: 1 }}>
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
                                    <Edit fontSize="small" />
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
                                    <Delete fontSize="small" />
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
                                                <Typography variant="body1">
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
                                                  <Edit fontSize="small" />
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
                                                  <Delete fontSize="small" />
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
                                          <Typography variant="body1">
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
                                            <Edit fontSize="small" />
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
                                            <Delete fontSize="small" />
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
        <Accordion sx={{ mt: 2 }}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              width="100%"
            >
              <Typography variant="h6">
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
                <Add color="primary" />
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
                      <Typography variant="body1">{note}</Typography>
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
                        <Edit fontSize="small" />
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
                        <Delete fontSize="small" />
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
