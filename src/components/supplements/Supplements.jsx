import React from "react";
import { Box, Paper, Typography, IconButton, Grid } from "@mui/material";
import { Delete, Edit } from "@mui/icons-material";
import LocalPharmacyIcon from "@mui/icons-material/LocalPharmacy";
import { SupplementForm } from "../../utils/Forms";

const Supplements = ({
  supplements,
  setSupplements,
  handleSupplementSubmit,
  editingSupplement,
  setEditingSupplement,
}) => {
  return (
    <Paper sx={{ p: 3, borderRadius: 2, mb: 4 }}>
      <Typography
        variant="h5"
        sx={{
          mb: 4,
          display: "flex",
          alignItems: "center",
          gap: 1,
          color: "primary.main",
          fontWeight: "bold",
        }}
      >
        <LocalPharmacyIcon fontSize="large" />
        Takviye Yönetimi
      </Typography>

      {/* Takviye Formu */}
      <SupplementForm
        onSubmit={handleSupplementSubmit}
        initialData={editingSupplement}
        setEditingSupplement={setEditingSupplement}
      />

      {/* Takviye Kartları */}
      {supplements.length === 0 ? (
        <Box sx={{ textAlign: "center", py: 4 }}>
          <img
            src="/empty-state.svg"
            alt="Boş takviye"
            style={{ height: 150, opacity: 0.7 }}
          />
          <Typography variant="h6" color="text.secondary" sx={{ mt: 2 }}>
            Henüz takviye eklenmemiş
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Yukarıdaki formu kullanarak yeni takviyeler ekleyin.
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {supplements.map((supplement) => (
            <Grid item xs={12} md={6} key={supplement.id}>
              <Paper
                sx={{
                  p: 3,
                  borderRadius: 2,
                  background:
                    "linear-gradient(145deg, #ffffff 0%, #f5f5f5 100%)",
                  transition:
                    "transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out",
                  "&:hover": {
                    transform: "translateY(-3px)",
                    boxShadow: 3,
                  },
                  display: "flex",
                  flexDirection: "column",
                  height: "100%",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    mb: 2,
                  }}
                >
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {supplement.title}
                  </Typography>
                  <Box>
                    <IconButton
                      onClick={() => setEditingSupplement(supplement)}
                    >
                      <Edit fontSize="small" />
                    </IconButton>
                    <IconButton
                      onClick={() =>
                        setSupplements(
                          supplements.filter((s) => s.id !== supplement.id)
                        )
                      }
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography
                    variant="body2"
                    sx={{ whiteSpace: "pre-line", fontFamily: "monospace" }}
                  >
                    {supplement.content}
                  </Typography>
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}
    </Paper>
  );
};

export default Supplements;
