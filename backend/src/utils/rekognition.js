/**
 * CampusRelay — AWS Rekognition KYC Service
 * 
 * Free tier: 1,000 face comparisons/month → ₹0 for 500 students
 * 
 * What this does:
 *  1. Compares selfie vs college ID photo (face match)
 *  2. Checks for duplicate faces already registered (fraud prevention)
 *  3. Indexes the face for future duplicate checks
 *  4. Auto-approves if confidence ≥ 80%
 */

const AWS = require('aws-sdk');

// Configure AWS — credentials come from .env
const rekognition = new AWS.Rekognition({
  region:          process.env.AWS_REGION || 'ap-south-1', // Mumbai — lowest latency from India
  accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

const COLLECTION_ID       = 'campusrelay-faces';  // AWS Rekognition face index
const MATCH_THRESHOLD     = 80;                   // Minimum confidence % to pass
const DUPLICATE_THRESHOLD = 90;                   // Confidence % to flag as duplicate

// ── Step 1: Create face collection (run ONCE when you set up AWS) ─────────────
exports.createFaceCollection = async () => {
  try {
    await rekognition.createCollection({ CollectionId: COLLECTION_ID }).promise();
    console.log('✅ AWS Rekognition collection created:', COLLECTION_ID);
  } catch (err) {
    // ResourceAlreadyExistsException is fine — collection already exists
    if (err.code === 'ResourceAlreadyExistsException') {
      console.log('ℹ️  Rekognition collection already exists — skipping');
    } else {
      throw err;
    }
  }
};

// ── Step 2: Core face match — selfie vs college ID ────────────────────────────
const compareFaces = async (selfieBuffer, collegeIdBuffer) => {
  const params = {
    SourceImage: { Bytes: selfieBuffer    }, // selfie (the person right now)
    TargetImage: { Bytes: collegeIdBuffer }, // college ID photo
    SimilarityThreshold: MATCH_THRESHOLD,
  };

  const result = await rekognition.compareFaces(params).promise();

  if (!result.FaceMatches || result.FaceMatches.length === 0) {
    return {
      passed:     false,
      confidence: 0,
      reason:     'No face detected or faces do not match. Please upload a clear, well-lit selfie.',
    };
  }

  const confidence = result.FaceMatches[0].Similarity;
  return {
    passed:     confidence >= MATCH_THRESHOLD,
    confidence: parseFloat(confidence.toFixed(1)),
    reason:     confidence >= MATCH_THRESHOLD
      ? 'Face match successful'
      : `Face confidence too low (${confidence.toFixed(0)}%). Please re-upload a clearer selfie.`,
  };
};

// ── Step 3: Duplicate face check — is this person already registered? ─────────
const checkDuplicateFace = async (selfieBuffer) => {
  try {
    const result = await rekognition.searchFacesByImage({
      CollectionId:       COLLECTION_ID,
      Image:              { Bytes: selfieBuffer },
      MaxFaces:           1,
      FaceMatchThreshold: DUPLICATE_THRESHOLD,
    }).promise();

    if (result.FaceMatches && result.FaceMatches.length > 0) {
      const match = result.FaceMatches[0];
      return {
        isDuplicate:     true,
        duplicateUserId: match.Face.ExternalImageId, // we store userId here
        confidence:      match.Similarity,
      };
    }

    return { isDuplicate: false };
  } catch (err) {
    // InvalidParameterException = no faces in image — handle gracefully
    if (err.code === 'InvalidParameterException') {
      return { isDuplicate: false, noFaceDetected: true };
    }
    throw err;
  }
};

// ── Step 4: Index face — store for future duplicate checks ────────────────────
const indexFace = async (selfieBuffer, userId) => {
  try {
    await rekognition.indexFaces({
      CollectionId:    COLLECTION_ID,
      Image:           { Bytes: selfieBuffer },
      ExternalImageId: userId.toString(), // store userId so we can find who it is
      MaxFaces:        1,
      DetectionAttributes: ['DEFAULT'],
    }).promise();
    return { indexed: true };
  } catch (err) {
    console.error('Face indexing failed (non-critical):', err.message);
    return { indexed: false }; // don't block approval if indexing fails
  }
};

// ── Step 5: Remove face from index (for bans or account deletion) ─────────────
exports.removeFaceFromIndex = async (userId) => {
  try {
    // Find all faces for this user
    const faces = await rekognition.listFaces({ CollectionId: COLLECTION_ID }).promise();
    const userFaces = faces.Faces
      .filter(f => f.ExternalImageId === userId.toString())
      .map(f => f.FaceId);

    if (userFaces.length > 0) {
      await rekognition.deleteFaces({
        CollectionId: COLLECTION_ID,
        FaceIds:      userFaces,
      }).promise();
    }
  } catch (err) {
    console.error('Face removal failed:', err.message);
  }
};

// ── MAIN: Full KYC verification pipeline ─────────────────────────────────────
/**
 * @param {Buffer} selfieBuffer     - selfie image buffer from multer
 * @param {Buffer} collegeIdBuffer  - college ID image buffer from multer
 * @param {string} userId           - MongoDB user _id
 * @returns {Object} { approved, confidence, reason, isDuplicate }
 */
exports.runKYCVerification = async (selfieBuffer, collegeIdBuffer, userId) => {
  console.log(`🔐 Starting KYC verification for user ${userId}`);

  // ── Stage 1: Face Match ───────────────────────────────────────────────────
  console.log('  Stage 1: Comparing selfie vs college ID...');
  const faceMatch = await compareFaces(selfieBuffer, collegeIdBuffer);

  if (!faceMatch.passed) {
    console.log(`  ❌ Face match failed: ${faceMatch.confidence}%`);
    return {
      approved:   false,
      confidence: faceMatch.confidence,
      reason:     faceMatch.reason,
      stage:      'face_match',
    };
  }
  console.log(`  ✅ Face match passed: ${faceMatch.confidence}%`);

  // ── Stage 2: Duplicate Check ─────────────────────────────────────────────
  console.log('  Stage 2: Checking for duplicate registration...');
  const dupCheck = await checkDuplicateFace(selfieBuffer);

  if (dupCheck.isDuplicate) {
    console.log(`  ❌ Duplicate face detected — user ${dupCheck.duplicateUserId}`);
    return {
      approved:        false,
      confidence:      faceMatch.confidence,
      reason:          'This face is already registered with another account. Contact support if this is an error.',
      stage:           'duplicate_check',
      duplicateUserId: dupCheck.duplicateUserId,
    };
  }
  console.log('  ✅ No duplicate found');

  // ── Stage 3: Index Face ──────────────────────────────────────────────────
  console.log('  Stage 3: Indexing face for future checks...');
  await indexFace(selfieBuffer, userId);
  console.log('  ✅ Face indexed');

  // ── ALL STAGES PASSED — AUTO APPROVE ─────────────────────────────────────
  console.log(`  🎉 KYC auto-approved for user ${userId} (${faceMatch.confidence}% confidence)`);
  return {
    approved:   true,
    confidence: faceMatch.confidence,
    reason:     'Identity verified successfully',
    stage:      'approved',
  };
};
