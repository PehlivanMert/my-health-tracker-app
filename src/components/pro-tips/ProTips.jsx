import React from "react";
import { Box, Paper, Typography, Grid, Chip } from "@mui/material";
import LocalPharmacyIcon from "@mui/icons-material/LocalPharmacy";
import LocalDrinkIcon from "@mui/icons-material/LocalDrink";
import WaterDropIcon from "@mui/icons-material/WaterDrop";
import FitnessCenterIcon from "@mui/icons-material/FitnessCenter";
import RestaurantIcon from "@mui/icons-material/Restaurant";
import StickyNote2Icon from "@mui/icons-material/StickyNote2";

const ProTips = ({ additionalInfo }) => {
  return (
    <Paper sx={{ p: 3, borderRadius: 2 }}>
      {/* Ana Başlık */}
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
        <LocalDrinkIcon /> Pro Öneriler
      </Typography>

      {/* Sıvı Tüketim Hedefleri */}
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h6"
          sx={{
            mb: 2,
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          <WaterDropIcon color="primary" />
          {additionalInfo.liquidConsumptionGoals.title}
        </Typography>
        <Grid container spacing={2}>
          {additionalInfo.liquidConsumptionGoals.items.map((item, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <Paper
                elevation={2}
                sx={{
                  p: 2,
                  height: "100%",
                  background:
                    "linear-gradient(145deg, #ffffff 0%, #f5f5f5 100%)",
                  borderRadius: 2,
                  transition: "transform 0.2s ease-in-out",
                  "&:hover": {
                    transform: "translateY(-3px)",
                    boxShadow: 3,
                  },
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Typography
                    variant="subtitle1"
                    sx={{ fontWeight: 500, color: "text.primary" }}
                  >
                    {item.name}
                  </Typography>
                  <Chip
                    label={item.value}
                    color="primary"
                    variant="outlined"
                    size="small"
                    sx={{ borderRadius: 1 }}
                  />
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Günlük Aktivite Hedefleri */}
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h6"
          sx={{
            mb: 2,
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          <FitnessCenterIcon color="primary" />
          {additionalInfo.dailyActivityGoals.title}
        </Typography>
        <Grid container spacing={2}>
          {additionalInfo.dailyActivityGoals.items.map((item, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <Paper
                elevation={2}
                sx={{
                  p: 2,
                  height: "100%",
                  background:
                    "linear-gradient(145deg, #ffffff 0%, #f5f5f5 100%)",
                  borderRadius: 2,
                  transition: "transform 0.2s ease-in-out",
                  "&:hover": {
                    transform: "translateY(-3px)",
                    boxShadow: 3,
                  },
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Typography
                    variant="subtitle1"
                    sx={{ fontWeight: 500, color: "text.primary" }}
                  >
                    {item.name}
                  </Typography>
                  <Chip
                    label={item.value}
                    color="secondary"
                    variant="outlined"
                    size="small"
                    sx={{ borderRadius: 1 }}
                  />
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Tarifler */}
      <Box>
        <Typography
          variant="h6"
          sx={{
            mb: 3,
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          <RestaurantIcon color="primary" />
          Tarifler
        </Typography>
        <Grid container spacing={3}>
          {Object.entries(additionalInfo.recipes).map(([key, recipe]) => (
            <Grid item xs={12} md={6} key={key}>
              <Paper
                elevation={3}
                sx={{
                  p: 3,
                  height: "100%",
                  borderRadius: 2,
                  background:
                    "linear-gradient(145deg, #ffffff 0%, #f5f5f5 100%)",
                  position: "relative", // Absolute konumlandırılacak bölümler için parent burada konumlandırılmalı
                  overflow: "hidden",
                  minHeight: 400, // Her tarifin aynı minimum yüksekliğe sahip olması için
                  "&::before": {
                    content: '""',
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "4px",
                    background:
                      "linear-gradient(90deg, primary.main, secondary.main)",
                  },
                }}
              >
                {/* Tarif Başlığı */}
                <Typography
                  variant="h6"
                  sx={{
                    mb: 2,
                    color: "primary.main",
                    fontWeight: "bold",
                  }}
                >
                  {recipe.title}
                </Typography>

                <Grid container spacing={3}>
                  {/* Malzemeler Bölümü */}
                  <Grid item xs={12} md={recipe.preparation ? 6 : 12}>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                      🧂 Malzemeler
                    </Typography>
                    <ul style={{ margin: 0, paddingLeft: 20 }}>
                      {recipe.ingredients.map((ingredient, index) => (
                        <li key={index}>
                          <Typography
                            variant="body2"
                            sx={{
                              mb: 1,
                              whiteSpace: "pre-line",
                            }}
                          >
                            {ingredient}
                          </Typography>
                        </li>
                      ))}
                    </ul>
                  </Grid>

                  {/* Hazırlanış Bölümü (varsa) */}
                  {recipe.preparation && (
                    <Grid item xs={12} md={6}>
                      <Typography variant="h6" sx={{ mb: 2 }}>
                        👩🍳 Hazırlanış
                      </Typography>
                      <ol style={{ margin: 0, paddingLeft: 20 }}>
                        {recipe.preparation.map((step, index) => (
                          <li key={index}>
                            <Typography
                              variant="body2"
                              sx={{
                                mb: 1,
                                whiteSpace: "pre-line",
                              }}
                            >
                              {step}
                            </Typography>
                          </li>
                        ))}
                      </ol>
                    </Grid>
                  )}
                </Grid>

                {/* İpuçları, Faydalar ve Notlar Bölümü - Sol Alt */}
                {(recipe.tips || recipe.benefits || recipe.notes) && (
                  <Box
                    sx={{
                      mt: 3,
                      bottom: 16,
                      left: 16,
                      right: 16,
                    }}
                  >
                    <Grid container spacing={1}>
                      {recipe.tips && (
                        <Grid item xs={12}>
                          <Typography variant="subtitle2" color="text.primary">
                            İpuçları:
                          </Typography>
                          <ul style={{ margin: 0, paddingLeft: 16 }}>
                            {Array.isArray(recipe.tips) ? (
                              recipe.tips.map((tip, index) => (
                                <li key={index}>
                                  <Typography
                                    variant="caption"
                                    sx={{ whiteSpace: "pre-line" }}
                                  >
                                    {tip}
                                  </Typography>
                                </li>
                              ))
                            ) : (
                              <Typography
                                variant="caption"
                                sx={{ whiteSpace: "pre-line" }}
                              >
                                {recipe.tips}
                              </Typography>
                            )}
                          </ul>
                        </Grid>
                      )}
                      {recipe.benefits && (
                        <Grid item xs={12}>
                          <Typography variant="subtitle2" color="text.primary">
                            Faydalar:
                          </Typography>
                          <ul style={{ margin: 0, paddingLeft: 16 }}>
                            {Array.isArray(recipe.benefits) ? (
                              recipe.benefits.map((benefit, index) => (
                                <li key={index}>
                                  <Typography
                                    variant="caption"
                                    sx={{ whiteSpace: "pre-line" }}
                                  >
                                    {benefit}
                                  </Typography>
                                </li>
                              ))
                            ) : (
                              <Typography
                                variant="caption"
                                sx={{ whiteSpace: "pre-line" }}
                              >
                                {recipe.benefits}
                              </Typography>
                            )}
                          </ul>
                        </Grid>
                      )}
                      {recipe.notes && (
                        <Grid item xs={12}>
                          <Typography variant="subtitle2" color="text.primary">
                            Notlar:
                          </Typography>
                          {Array.isArray(recipe.notes) ? (
                            recipe.notes.map((note, index) => (
                              <Typography
                                key={index}
                                variant="caption"
                                display="block"
                                sx={{
                                  fontStyle: "italic",
                                  whiteSpace: "pre-line",
                                }}
                              >
                                {note}
                              </Typography>
                            ))
                          ) : (
                            <Typography
                              variant="caption"
                              display="block"
                              sx={{
                                fontStyle: "italic",
                                whiteSpace: "pre-line",
                              }}
                            >
                              {recipe.notes}
                            </Typography>
                          )}
                        </Grid>
                      )}
                    </Grid>
                  </Box>
                )}
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Takviye Analizleri */}
      <Box sx={{ mt: 4 }}>
        <Typography
          variant="h5"
          sx={{ mb: 3, display: "flex", alignItems: "center", gap: 1 }}
        >
          <LocalPharmacyIcon fontSize="large" /> Takviye Analizleri
        </Typography>

        {/* Vitamin Tabloları */}
        {[
          "multivitamin",
          "omega3",
          "magnesium",
          "biotin",
          "probiotic",
          "immune",
          "collagen",
        ].map((key) => (
          <Box key={key} sx={{ mb: 4 }}>
            <Typography
              variant="h6"
              sx={{
                mb: 2,
                p: 1,
                bgcolor: "primary.light",
                color: "primary.contrastText",
                borderRadius: 1,
              }}
            >
              {additionalInfo.supplementDetails[key].title}
            </Typography>

            {/* Eğer alt gruplar varsa (örneğin "Vitamin İçeriği", "Mineral İçeriği" vb.) */}
            {additionalInfo.supplementDetails[key].groups ? (
              additionalInfo.supplementDetails[key].groups.map(
                (group, groupIndex) => (
                  <Box key={groupIndex} sx={{ mb: 2 }}>
                    <Typography
                      variant="subtitle2"
                      sx={{
                        mb: 1,
                        fontWeight: "bold",
                        color: "text.secondary",
                      }}
                    >
                      {group.heading}
                    </Typography>
                    <Grid container spacing={2}>
                      {group.items.map((item, index) => (
                        <Grid item xs={12} sm={6} md={4} key={index}>
                          <Paper
                            sx={{
                              p: 2,
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              background:
                                "linear-gradient(145deg, #f5f5f5 0%, #ffffff 100%)",
                              transition: "transform 0.2s",
                              "&:hover": {
                                transform: "translateY(-2px)",
                              },
                            }}
                          >
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: 500 }}
                            >
                              {item.name}
                            </Typography>
                            <Box sx={{ textAlign: "right" }}>
                              <Typography variant="body2">
                                {item.amount}
                              </Typography>
                              {item.dailyValue && (
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                >
                                  ({item.dailyValue})
                                </Typography>
                              )}
                            </Box>
                          </Paper>
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                )
              )
            ) : (
              // Alt grup yoksa doğrudan mevcut "items" üzerinden render edilir.
              <Grid container spacing={2}>
                {additionalInfo.supplementDetails[key].items.map(
                  (item, index) => (
                    <Grid item xs={12} sm={6} md={4} key={index}>
                      <Paper
                        sx={{
                          p: 2,
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          background:
                            "linear-gradient(145deg, #f5f5f5 0%, #ffffff 100%)",
                          transition: "transform 0.2s",
                          "&:hover": {
                            transform: "translateY(-2px)",
                          },
                        }}
                      >
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {item.name}
                        </Typography>
                        <Box sx={{ textAlign: "right" }}>
                          <Typography variant="body2">{item.amount}</Typography>
                          {item.dailyValue && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              ({item.dailyValue})
                            </Typography>
                          )}
                        </Box>
                      </Paper>
                    </Grid>
                  )
                )}
              </Grid>
            )}
          </Box>
        ))}

        {/* Yeni Takviyeler */}
        <Box sx={{ mt: 4 }}>
          <Typography
            variant="h6"
            sx={{
              mb: 2,
              p: 1,
              bgcolor: "secondary.light",
              color: "secondary.contrastText",
              borderRadius: 1,
            }}
          >
            {additionalInfo.supplementDetails.newSupplements.title}
          </Typography>
          <Grid container spacing={2}>
            {additionalInfo.supplementDetails.newSupplements.items.map(
              (item, index) => (
                <Grid item xs={12} md={6} key={index}>
                  <Paper sx={{ p: 2, bgcolor: "background.paper" }}>
                    <Typography
                      variant="subtitle1"
                      sx={{ mb: 1, fontWeight: 600 }}
                    >
                      {item.name}
                    </Typography>
                    {item.details.map((detail, idx) => (
                      <Box
                        key={idx}
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          py: 0.5,
                          borderBottom: "1px solid",
                          borderColor: "divider",
                        }}
                      >
                        <Typography variant="body2">{detail.label}</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {detail.value}
                        </Typography>
                      </Box>
                    ))}
                  </Paper>
                </Grid>
              )
            )}
          </Grid>
        </Box>

        {/* Önemli Notlar */}
        <Box sx={{ mt: 4 }}>
          <Typography
            variant="h6"
            sx={{
              mb: 2,
              p: 1,
              bgcolor: "error.light",
              color: "error.contrastText",
              borderRadius: 1,
            }}
          >
            {additionalInfo.supplementDetails.importantNotes.title}
          </Typography>
          <Paper sx={{ p: 2, bgcolor: "background.default" }}>
            <ul style={{ margin: 0, paddingLeft: 24 }}>
              {additionalInfo.supplementDetails.importantNotes.items.map(
                (note, index) => (
                  <li key={index}>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      {note}
                    </Typography>
                  </li>
                )
              )}
            </ul>
          </Paper>
        </Box>
      </Box>

      {/* Genel Öneriler */}
      <Box sx={{ mt: 4 }}>
        <Typography
          variant="h6"
          sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1 }}
        >
          <StickyNote2Icon /> Genel Öneriler
        </Typography>
        <Grid container spacing={2} sx={{ alignItems: "stretch" }}>
          <Grid item xs={12} md={6} sx={{ display: "flex" }}>
            <Paper
              sx={{
                p: 2,
                bgcolor: "background.default",
                flex: 1,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                Yürüyüş İpuçları:
              </Typography>
              <ul style={{ paddingLeft: 20, margin: 0 }}>
                <li>
                  <Typography variant="body2">
                    Podcast/müzik dinleyin
                  </Typography>
                </li>
                <li>
                  <Typography variant="body2">
                    Termosta zencefil suyu taşıyın
                  </Typography>
                </li>
                <li>
                  <Typography variant="body2">
                    Soğuk havalarda AVM tercih edin
                  </Typography>
                </li>
              </ul>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, bgcolor: "background.default" }}>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                Takviye Kullanımı:
              </Typography>
              <ul style={{ paddingLeft: 20, margin: 0 }}>
                <li>
                  <Typography variant="body2">
                    Kahveyi 15:00'ten sonra tüketmeyin
                  </Typography>
                </li>
                <li>
                  <Typography variant="body2">
                    Probiyotiği diğer takviyelerden 30 dk önce alın
                  </Typography>
                </li>
                <li>
                  <Typography variant="body2">
                    Magnezyumu demir içeren takviyelerden ayrı alın
                  </Typography>
                </li>
                <li>
                  <Typography variant="body2">Adım sayar kullanın</Typography>
                </li>
                <li>
                  <Typography variant="body2">
                    Stretching yapmayı unutmayın
                  </Typography>
                </li>
              </ul>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Paper>
  );
};
export default ProTips;
