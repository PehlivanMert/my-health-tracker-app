import React, { useState } from "react";
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Button,
  useTheme,
  Collapse,
} from "@mui/material";
import { Delete, Edit, Add, Close, LocalPharmacy } from "@mui/icons-material";
import { toast } from "react-toastify";

const SUPPLEMENT_TYPES = {
  vitamin: "Vitamin",
  mineral: "Mineral",
  herb: "Bitkisel Takviye",
  protein: "Protein",
  aminoacid: "Amino Asit",
  other: "Diğer",
};

const Supplements = ({ supplements, setSupplements }) => {
  const theme = useTheme();
  const [openModal, setOpenModal] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [editingSupplement, setEditingSupplement] = useState({
    id: null,
    title: "",
    type: "",
    dosage: "",
    instructions: "",
  });

  const handleSubmitSupplement = () => {
    if (!editingSupplement.title || !editingSupplement.instructions) {
      toast.error("Lütfen zorunlu alanları doldurun");
      return;
    }

    const newSupplement = {
      id: editingSupplement.id || Date.now().toString(),
      title: editingSupplement.title,
      content: `Tür: ${editingSupplement.type || "Belirtilmemiş"}\nDozaj: ${
        editingSupplement.dosage || "Belirtilmemiş"
      }\nTalimatlar:\n${editingSupplement.instructions}`,
    };

    setSupplements((prev) => {
      if (editingSupplement.id) {
        return prev.map((sup) =>
          sup.id === editingSupplement.id ? newSupplement : sup
        );
      }
      return [...prev, newSupplement];
    });

    toast.success(
      editingSupplement.id ? "Takviye güncellendi!" : "Yeni takviye eklendi!"
    );

    setEditingSupplement({
      id: null,
      title: "",
      type: "",
      dosage: "",
      instructions: "",
    });
    setOpenModal(false);
  };

  return (
    <Paper sx={{ p: 3, borderRadius: 4, boxShadow: theme.shadows[3] }}>
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          justifyContent: "space-between",
          alignItems: { xs: "flex-end", sm: "center" }, // xs'te sağa dayalı olması için flex-end
          mb: 4,
          gap: 2,
        }}
      >
        <Typography
          variant="h4"
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 2,
          }}
        >
          <LocalPharmacy fontSize="large" />
          Takviye Yönetim Paneli
        </Typography>

        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => {
            setEditingSupplement({
              id: null,
              title: "",
              type: "",
              dosage: "",
              instructions: "",
            });
            setOpenModal(true);
          }}
        >
          Yeni Takviye Ekle
        </Button>
      </Box>

      <Dialog
        open={openModal}
        onClose={() => setOpenModal(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            {editingSupplement.id ? "Takviye Düzenle" : "Yeni Takviye Ekle"}
            <IconButton onClick={() => setOpenModal(false)}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <TextField
              label="Takviye Adı*"
              fullWidth
              value={editingSupplement.title}
              onChange={(e) =>
                setEditingSupplement({
                  ...editingSupplement,
                  title: e.target.value,
                })
              }
              sx={{ mb: 2 }}
            />

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Takviye Türü</InputLabel>
              <Select
                value={editingSupplement.type}
                onChange={(e) =>
                  setEditingSupplement({
                    ...editingSupplement,
                    type: e.target.value,
                  })
                }
              >
                {Object.keys(SUPPLEMENT_TYPES).map((type) => (
                  <MenuItem key={type} value={type}>
                    {SUPPLEMENT_TYPES[type]}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Dozaj"
              fullWidth
              value={editingSupplement.dosage}
              onChange={(e) =>
                setEditingSupplement({
                  ...editingSupplement,
                  dosage: e.target.value,
                })
              }
              sx={{ mb: 2 }}
            />

            <TextField
              label="Talimatlar*"
              multiline
              rows={4}
              fullWidth
              value={editingSupplement.instructions}
              onChange={(e) =>
                setEditingSupplement({
                  ...editingSupplement,
                  instructions: e.target.value,
                })
              }
              placeholder="Kullanım talimatlarını detaylı şekilde yazın"
            />

            <Box
              sx={{
                mt: 3,
                display: "flex",
                justifyContent: "flex-end",
                gap: 2,
              }}
            >
              <Button variant="outlined" onClick={() => setOpenModal(false)}>
                İptal
              </Button>
              <Button variant="contained" onClick={handleSubmitSupplement}>
                {editingSupplement.id ? "Güncelle" : "Kaydet"}
              </Button>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>

      {supplements.length === 0 ? (
        <Box
          sx={{
            textAlign: "center",
            p: 4,
            border: `2px dashed ${theme.palette.divider}`,
          }}
        >
          <Typography variant="h6" color="textSecondary">
            Henüz takviye eklenmemiş
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {supplements.map((supplement) => (
            <Grid item xs={12} md={6} lg={4} key={supplement.id}>
              <Paper sx={{ p: 3, height: "100%", position: "relative" }}>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography
                    variant="h6"
                    onClick={() =>
                      setExpandedId(
                        expandedId === supplement.id ? null : supplement.id
                      )
                    }
                    sx={{ cursor: "pointer", flexGrow: 1 }}
                  >
                    {supplement.title}
                  </Typography>
                  <Box>
                    <IconButton
                      onClick={(e) => {
                        e.stopPropagation();
                        const instructions = supplement.content
                          .split("Talimatlar:\n")[1]
                          ?.split("\n")
                          .map((line) => line.replace(/^\d+\.\s*/, ""))
                          .join("\n");

                        setEditingSupplement({
                          id: supplement.id,
                          title: supplement.title,
                          type:
                            supplement.content.match(/Tür: (.*)/)?.[1] || "",
                          dosage:
                            supplement.content.match(/Dozaj: (.*)/)?.[1] || "",
                          instructions: instructions || "",
                        });
                        setOpenModal(true);
                      }}
                    >
                      <Edit />
                    </IconButton>
                    <IconButton
                      onClick={(e) => {
                        e.stopPropagation();
                        setSupplements(
                          supplements.filter((s) => s.id !== supplement.id)
                        );
                      }}
                    >
                      <Delete />
                    </IconButton>
                  </Box>
                </Box>

                <Collapse in={expandedId === supplement.id}>
                  <Typography sx={{ whiteSpace: "pre-line", mt: 2 }}>
                    {supplement.content.split("\n").map((line, i) => (
                      <span key={i} style={{ display: "block" }}>
                        {line.startsWith("Tür:") ||
                        line.startsWith("Dozaj:") ||
                        line.startsWith("Talimatlar:") ? (
                          <strong>{line}</strong>
                        ) : (
                          line
                        )}
                      </span>
                    ))}
                  </Typography>
                </Collapse>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}
    </Paper>
  );
};

export default Supplements;
