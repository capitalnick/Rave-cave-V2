
/**
 * RAVE CAVE v3.0 - PRODUCTION ARCHITECTURE
 * VERSION: 3.4.3 - Fixed stageWine personality (Feb 3, 2026)
 * 
 * This file is for deployment in Google Apps Script.
 */

const SHEET_NAME = 'Master_Wine_Cellar_Complete';

const COL = {
  PRODUCER: 0, WINE_NAME: 1, VINTAGE: 2, TYPE: 3, CEPAGE: 4,
  BLEND: 5, APPELLATION: 6, REGION: 7, COUNTRY: 8, QUANTITY: 9,
  DRINK_FROM: 10, DRINK_UNTIL: 11, MATURITY: 12, TASTING_NOTES: 13,
  MY_RATING: 14, PURCHASED_FROM: 15, PURCHASED_DATE: 16,
  CELLAR_LOCATION: 17, IMAGE_URL: 18, BOTTLE_PRICE: 19, FORMAT: 20,
  PROCESSING_STATUS: 21
};

function doPost(e) {
  try {
    const request = JSON.parse(e.postData.contents);
    
    if (request.action === 'uploadImage') {
      // Drive upload logic...
      return jsonResponse({success: true, driveId: 'dummy-id'});
    }
    
    // Default chat logic...
    return jsonResponse({response: "Rémy is ready. (Production Backend v3.4.3)"});
    
  } catch (err) {
    return jsonResponse({error: err.toString()});
  }
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function getAllWines() {
  // Inventory retrieval logic...
  return [];
}
