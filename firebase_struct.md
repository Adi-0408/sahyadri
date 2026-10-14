# Firebase Database Schema: Properties Collection

This document outlines the data structure for the `properties` collection in Firebase. It is intended for Android and backend developers to understand how properties are structured, typed, and saved across the React web app.

> **Note:** Because this is a NoSQL schema (Firestore), some fields are dynamic and might only exist for specific property categories (e.g., `flatType` only exists for Flats, while `gutNumber` only exists for Land/Plots). 

## 1. Core Metadata
Every document in the `properties` collection will always have these core attributes.
```json
{
  "id": "String (Auto-generated Firestore Document ID)",
  "category": "String (e.g., 'Flat', 'House', 'Bungalow', 'Plot', 'Land')",
  "type": "String (e.g., 'sale' or 'rent')",
  "status": "String (e.g., 'pending', 'approved', 'active', 'rejected')",
  "createdAt": "String (ISO 8601 Timestamp format)",
  "userId": "String (Firebase Auth UID of the user who posted it)"
}
```

## 2. Basic Information
```json
{
  "propertyName": "String",
  "title": "String (Optional display title)",
  "titleMr": "String (Optional Marathi display title)",
  "description": "String"
}
```

## 3. Owner Details
```json
{
  "ownerName": "String",
  "email": "String",
  "mobileNumber": "String",
  "alternateMobile": "String"
}
```

## 4. Pricing & Finance
Depending on whether the property `type` is `sale` or `rent`, these fields will be populated:

**For Sale (`type: 'sale'`):**
```json
{
  "expectedPrice": "Number",
  "price": "Number (Used for fallback/display)",
  "isNegotiable": "Boolean",
  "priceType": "String (For plots/land: 'total_price', 'price_per_sqft', 'price_per_guntha', 'price_per_acre')",
  "priceAmount": "Number (Used if priceType is not 'total_price')",
  
  // Loan Specifics
  "hasLoan": "Boolean",
  "loanBankName": "String",
  "loanAmount": "Number"
}
```

**For Rent (`type: 'rent'`):**
```json
{
  "monthlyRent": "Number",
  "securityDeposit": "Number",
  "maintenanceCharges": "Number"
}
```

## 5. Address & Location
```json
{
  "state": "String (Default: 'Maharashtra')",
  "district": "String (e.g., 'Sangli')",
  "taluka": "String (e.g., 'Miraj')",
  "cityVillage": "String",
  "pincode": "String",
  "fullAddress": "String",
  "location": "String (Optional, used for display summary)",
  "locationMr": "String (Optional Marathi location summary)",
  "landmark": "String (Optional)"
}
```

## 6. Layout & Structure (For Flats, Houses, Bungalows)
```json
{
  "areaType": "String ('sqft', 'guthevari', 'acre', 'hectare')",
  "builtUpArea": "Number",
  "carpetArea": "Number",
  "totalGuntha": "Number (Calculated internally based on builtUpArea)",
  "flatType": "String ('1BHK', '2BHK', '3BHK', etc. - Only for Flats)",
  "totalRooms": "Number",
  "bedrooms": "Number",
  "bathrooms": "Number",
  "balconies": "Number",
  "totalFloors": "Number",
  "floorNumber": "Number",
  "yearBuilt": "Number"
}
```

## 7. Additional Details & Amenities
```json
{
  "facingDirection": "String ('East', 'West', 'North', 'South', etc.)",
  "furnishingStatus": "String ('Unfurnished', 'Semi-Furnished', 'Fully-Furnished')",
  
  // Facilities
  "carParking": "Boolean",
  "parkingType": "String ('Covered', 'Open')",
  "parkingNumber": "String",
  "lift": "Boolean",
  "garden": "Boolean",
  "waterSupply": "Boolean",
  "powerBackup": "Boolean",
  
  // Tenant Preferences (Usually for rent)
  "bachelorsAllowed": "Boolean",
  "familyPreferred": "Boolean",
  "petsAllowed": "Boolean",
  "workingProfessionalsAllowed": "Boolean",
  "foodPreference": "String ('Both Allowed', 'Veg Only', 'Non-Veg')",
  
  // Extra Amenities Array
  "amenities": ["String", "String"]
}
```

## 8. Plot & Land Specific Details
These fields are primarily used when `category` is `Plot` or `Land`.
```json
{
  "gutNumber": "String (or gatNumber)",
  "landType": "String ('NA', 'Agricultural', etc.)",
  "occupancyClass": "String ('Class 1', 'Class 2')",
  "isSharedRoad": "Boolean",
  "roadAvailable": "Boolean",
  "roadTouch": "Boolean",
  "roadType": "String ('Registered Road', 'Kacha Road', 'Tar Road')",
  "gatedCommunity": "Boolean",
  "cornerPlot": "Boolean",
  "boundaryWall": "Boolean",
  "electricityConnection": "Boolean",
  "fencingAvailable": "Boolean"
}
```

## 9. Media
```json
{
  "images": ["String (Firebase Storage Download URLs)"]
}
```

## 10. Privacy & Visibility Settings
Used to toggle the display of sensitive information on the public-facing platform. Android clients must respect these flags when rendering UI.
```json
{
  "showPrice": "Boolean",
  "showAddress": "Boolean",
  "showExactLocation": "Boolean",
  "showOwnerName": "Boolean",
  "showOwnerContact": "Boolean",
  "showAmenities": "Boolean",
  "showImages": "Boolean",
  
  // Newer granularity visibility map
  "visibilitySettings": {
    "fields": {
      "expectedPrice": "Boolean",
      "mobileNumber": "Boolean",
      "ownerName": "Boolean"
    },
    "sections": {
      "addressDetails": "Boolean",
      "facilitiesUtilities": "Boolean",
      "mediaGallery": "Boolean"
    }
  }
}
```

## Notes for Android Developer:
1. **Nullability:** Because of the NoSQL nature, do not assume any field is strictly non-null unless it's in the `Core Metadata` section. For primitive types like `Number` and `Boolean`, use nullable types (e.g., `Integer?`, `Boolean?` in Kotlin) to prevent crashes when parsing older documents.
2. **Type Coercion:** Some numbers might be saved as strings in older documents depending on the form input history. Consider writing a custom deserializer or safe-cast function for financial amounts and area sizes.
3. **Privacy Rules:** The Android UI should conditionally hide sections if the `visibilitySettings` map dictates `false` for a particular field/section.

---

# Firebase Database Schema: `shots` Collection (99. Shots / Reels)

This collection powers the **"99. shots"** short-video feed in the Android/Mobile App. Whenever an admin adds or edits a shot in the Admin Panel, it is written to the `shots` collection (and mirrored to `99shots`).

### Collection Names
- Primary: `shots`
- Mirror / Alias: `99shorts`, `99shots`

> **CRITICAL RULE FOR MOBILE DEVELOPER (POST PROPERTY vs 99. SHOTS):**
> 1. When a user or agent posts a property in **"Post Property"**, the uploaded images and video (`videoPath`) belong **STRICTLY TO THE `properties` COLLECTION ONLY**.
> 2. **NEVER insert or mirror property videos into `shots` or `99shorts`!**
> 3. The **"99. Shots / Reels" screen must ONLY query `collection("shots")` (or `collection("99shorts")`)**.
> 4. **DO NOT query or merge documents from `collection("properties")` into the 99. Shots feed!** 99. Shots are exclusive reels managed by Admin from the Web Admin Panel.

### Document Structure
```json
{
  "id": "String (Auto-generated Firestore Document ID)",
  "title": "String (Short video headline, e.g. 'Luxury 3 BHK Villa in Sangli')",
  "titleMr": "String (Optional Marathi headline, e.g. 'सांगलीमध्ये आलिशान ३ बीएचके व्हिला')",
  "description": "String (Optional details or property features)",
  "videoUrl": "String (Direct video URL, e.g. MP4 hosted on Cloudinary, Firebase Storage, or local asset)",
  "thumbnailUrl": "String (Cover/Poster image for instant load before video starts)",
  "propertyId": "String (Optional Firestore ID of the linked property document in 'properties')",
  "propertyCode": "String (Optional short code, e.g. 'SAN-VILLA-01')",
  "price": "String (Optional display price, e.g. '₹75,00,000')",
  "location": "String (Optional location text, e.g. 'Vishrambag, Sangli')",
  "district": "String (e.g. 'Sangli')",
  "taluka": "String (e.g. 'Miraj')",
  "contactNumber": "String (e.g. '8328712712' for Call button)",
  "whatsappNumber": "String (e.g. '8328712712' for WhatsApp button)",
  "status": "String ('active' | 'hidden') - Filter where status == 'active' in mobile app",
  "active": "Boolean (true)",
  "views": "Number (Increment when viewed)",
  "likes": "Number",
  "createdAt": "String (ISO 8601 Timestamp)",
  "updatedAt": "String (ISO 8601 Timestamp)"
}
```

### Android App Implementation Guide (100% Reliable - No Index Requirement):
> **IMPORTANT NOTE FOR ANDROID DEVELOPER:**
> Do NOT use `.whereEqualTo("status", "active").orderBy("createdAt", Query.Direction.DESCENDING)` in Firestore directly without creating a composite index in the Firebase Console, as Firestore will throw a `FAILED_PRECONDITION` error and return 0 videos!
> Always query documents directly and sort/filter in Kotlin, or use `addSnapshotListener` for live updates.
> **DO NOT fetch from `properties` collection here — ONLY query `shots` (or `99shorts`)!**

```kotlin
// 1. Safe Real-time Query (Loads ONLY admin 99. Shots, NOT properties):
FirebaseFirestore.getInstance().collection("shots")
    .addSnapshotListener { snapshot, error ->
        if (error != null) {
            Log.e("Shots", "Error listening to shots: ${error.message}")
            return@addSnapshotListener
        }
        if (snapshot != null) {
            val shotsList = snapshot.documents.mapNotNull { doc ->
                val model = doc.toObject(ShotModel::class.java)
                // Fallback for snake_case vs camelCase field mapping
                if (model != null) {
                    if (model.videoUrl.isNullOrEmpty()) {
                        model.videoUrl = doc.getString("video_url") ?: doc.getString("video") ?: doc.getString("url") ?: ""
                    }
                    if (model.thumbnailUrl.isNullOrEmpty()) {
                        model.thumbnailUrl = doc.getString("thumbnail_url") ?: doc.getString("thumbnail") ?: doc.getString("image") ?: ""
                    }
                }
                model
            }.filter { shot ->
                // Show if active or if status is not explicitly hidden
                shot.status != "hidden" && shot.status != "inactive"
            }.sortedByDescending { shot ->
                shot.createdAt ?: ""
            }

            Log.d("Shots", "Loaded ${shotsList.size} shots successfully")
            // Pass shotsList to your vertical ViewPager2 / ExoPlayer Adapter
            reelsAdapter.submitList(shotsList)
        }
    }

// 2. Shot Data Model in Kotlin:
data class ShotModel(
    var id: String = "",
    var title: String = "",
    var titleMr: String = "",
    var description: String = "",
    var videoUrl: String = "",
    var thumbnailUrl: String = "",
    var propertyId: String = "",
    var propertyCode: String = "",
    var price: String = "",
    var location: String = "",
    var district: String = "",
    var taluka: String = "",
    var contactNumber: String = "8328712712",
    var whatsappNumber: String = "8328712712",
    var status: String = "active",
    var active: Boolean = true,
    var views: Long = 0,
    var createdAt: String = "",
    // Bunny.net Stream Fields:
    var hlsUrl: String? = null,           // e.g. https://vz-8654f697-8f6.b-cdn.net/<guid>/playlist.m3u8
    var directPlayUrl: String? = null,    // e.g. https://iframe.mediadelivery.net/play/766382/<guid>
    var bunnyVideoId: String? = null
)

// 3. ExoPlayer Setup for Bunny.net Video Playback:
// ExoPlayer natively handles both Bunny.net Stream HLS (.m3u8) and MP4:
val playableUri = when {
    !shot.hlsUrl.isNullOrEmpty() -> Uri.parse(shot.hlsUrl)
    !shot.videoUrl.isNullOrEmpty() -> Uri.parse(shot.videoUrl)
    else -> null
}

playableUri?.let { uri ->
    val mediaItem = MediaItem.fromUri(uri)
    exoPlayer.setMediaItem(mediaItem)
    exoPlayer.prepare()
    exoPlayer.playWhenReady = true
    exoPlayer.repeatMode = Player.REPEAT_MODE_ONE
}

// 4. Android Fullscreen Reel (One Video Per Screen with Snap Scrolling like YouTube Shorts / Instagram Reels):
// IMPORTANT: If you are using RecyclerView, two videos appear half-cut on screen unless you add PagerSnapHelper:

// Option A: If using RecyclerView:
val snapHelper = PagerSnapHelper()
snapHelper.attachToRecyclerView(binding.recyclerView)

// And in your item layout (item_shot_reel.xml):
// The root layout MUST HAVE layout_height="match_parent" (NOT wrap_content):
/*
<androidx.constraintlayout.widget.ConstraintLayout
    xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    android:layout_width="match_parent"
    android:layout_height="match_parent">

    <!-- Fullscreen Video / PlayerView -->
    <androidx.media3.ui.PlayerView
        android:id="@+id/playerView"
        android:layout_width="match_parent"
        android:layout_height="match_parent"
        app:use_controller="false"
        app:resize_mode="zoom" />

    <!-- Overlay Details: Price, Location, Title at bottom -->
    <LinearLayout
        android:layout_width="0dp"
        android:layout_height="wrap_content"
        android:orientation="vertical"
        android:layout_marginStart="16dp"
        android:layout_marginBottom="24dp"
        app:layout_constraintStart_toStartOf="parent"
        app:layout_constraintEnd_toStartOf="@+id/actionsLayout"
        app:layout_constraintBottom_toBottomOf="parent">
        
        <TextView
            android:id="@+id/tvPrice"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:background="#FF9800"
            android:textColor="#000000"
            android:textStyle="bold"
            android:paddingHorizontal="8dp"
            android:paddingVertical="4dp" />

        <TextView
            android:id="@+id/tvTitle"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:textColor="#FFFFFF"
            android:textSize="16sp"
            android:textStyle="bold"
            android:layout_marginTop="4dp" />
    </LinearLayout>

    <!-- Side Action Buttons (Call, WhatsApp) -->
    <LinearLayout
        android:id="@+id/actionsLayout"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:orientation="vertical"
        android:layout_marginEnd="16dp"
        android:layout_marginBottom="24dp"
        app:layout_constraintEnd_toEndOf="parent"
        app:layout_constraintBottom_toBottomOf="parent">

        <ImageButton
            android:id="@+id/btnCall"
            android:layout_width="48dp"
            android:layout_height="48dp"
            android:background="@drawable/circle_blue"
            android:src="@drawable/ic_call" />

        <ImageButton
            android:id="@+id/btnWhatsapp"
            android:layout_width="48dp"
            android:layout_height="48dp"
            android:layout_marginTop="12dp"
            android:background="@drawable/circle_green"
            android:src="@drawable/ic_whatsapp" />
    </LinearLayout>

</androidx.constraintlayout.widget.ConstraintLayout>
*/

// Option B: If using ViewPager2 (Best Practice for Reels):
binding.viewPager.orientation = ViewPager2.ORIENTATION_VERTICAL
binding.viewPager.adapter = reelsAdapter

// 5. AndroidManifest.xml Requirements:
// <uses-permission android:name="android.permission.INTERNET" />
// In <application android:usesCleartextTraffic="true" ... />
```

---

# Firebase Database Schema: `advertisements` & `banners` Collection (App Home Posters)

This collection powers the **Home Screen Top Promotional Poster Card** in the Android/Mobile App. Whenever an admin adds or updates a poster in the Admin Panel, it is saved to `advertisements` (and mirrored to `banners`).

### Collection Names
- Primary: `advertisements`
- Mirror / Alias: `banners`

### Document Structure
```json
{
  "id": "String (Auto-generated Firestore Document ID)",
  "brandBadge": "String (e.g. 'ASTITVA SIGNATURE' or 'SAHYADRI SIGNATURE')",
  "offerBadge": "String (e.g. 'LIMITED PERIOD OFFER')",
  "preTitle": "String (e.g. 'CHECK IN. NEVER LEAVE.')",
  "title": "String (e.g. 'HOME THAT FEELS LIKE A VACATION')",
  "titleMr": "String (Optional Marathi title, e.g. 'घराचा अनुभव एखाद्या सुट्टीसारखा')",
  "subtitle": "String (e.g. '2 & 3 BHK LUXURY HOMES • STARTING ₹ 35 LAKH*')",
  "image": "String (Download URL of the poster image)",
  "link": "String (e.g. '/properties' or '/property/{id}')",
  "propertyId": "String (Optional linked property document ID)",
  "propertyCode": "String (Optional short code, e.g. 'AST-SIGN-01')",
  "type": "String ('home_top_banner' | 'popup_banner' | 'promo_card')",
  "active": "Boolean (true = show on app, false = paused)",
  "views": "Number",
  "createdAt": "String (ISO 8601 Timestamp)",
  "updatedAt": "String (ISO 8601 Timestamp)"
}
```

### Android App Implementation Guide (Home Screen Top Carousel Slider - 2 to 3 sec Auto-Scroll):
```kotlin
// Query ALL active posters / banners in real-time (DO NOT limit to 1):
db.collection("advertisements")
  .whereEqualTo("active", true)
  .orderBy("createdAt", Query.Direction.DESCENDING)
  .addSnapshotListener { snapshot, error ->
    if (snapshot != null && !snapshot.isEmpty) {
      val bannerList = snapshot.documents.mapNotNull { doc ->
        doc.toObject(BannerModel::class.java)
      }
      
      // Bind to ViewPager2 or CarouselSlider adapter
      bannerSliderAdapter.submitList(bannerList)
      
      // Start 2.5 - 3 second auto-scroll animation
      startBannerAutoScroll(bannerList.size, intervalMs = 2800)
    }
  }

// Auto-scroll function for ViewPager2 (2.8 seconds interval):
private var autoScrollHandler = Handler(Looper.getMainLooper())
private var autoScrollRunnable: Runnable? = null

private fun startBannerAutoScroll(itemCount: Int, intervalMs: Long = 2800) {
    if (itemCount <= 1) return
    autoScrollRunnable?.let { autoScrollHandler.removeCallbacks(it) }
    
    autoScrollRunnable = object : Runnable {
        override fun run() {
            val current = viewPager2.currentItem
            val next = (current + 1) % itemCount
            viewPager2.setCurrentItem(next, true) // true enables smooth scroll animation
            autoScrollHandler.postDelayed(this, intervalMs)
        }
    }
    autoScrollHandler.postDelayed(autoScrollRunnable!!, intervalMs)
}
```

---

# Firebase Database Schema: `agents` Collection (Mobile App Agents)

This collection stores all **Real Estate Agents** registered or operating through the Android / Mobile App. Whenever an agent registers, is added, or updates their profile in the Mobile App, it is written to the `agents` collection. Any document in this collection instantly reflects in the web Admin Panel (`/admin/agents`) in real-time.

> **Note:** The Admin Panel also automatically listens to the `users` collection to pick up any mobile users registered with `role: 'agent'` or `userType: 'agent'`.

### Primary Collection Name: `agents`
*(Optional Mirror / Fallback: `users` with `role: "agent"`)*

### Document Structure:
```json
{
  "id": "String (Auto-generated Firestore Document ID or Firebase Auth UID)",
  "code": "String (Optional, e.g. 'AGT-105' or auto-assigned by admin)",
  "name": "String (Agent Full Name in English, e.g. 'Sachin Kadam')",
  "nameMr": "String (Optional Agent Name in Marathi, e.g. 'सचिन कदम')",
  "mobile": "String (10-digit mobile number, e.g. '9876543210')",
  "email": "String (Optional, e.g. 'sachin@gmail.com')",
  "photo": "String (Optional download URL of agent profile picture)",
  "district": "String (e.g. 'Sangli')",
  "taluka": "String (e.g. 'Miraj')",
  "cityVillage": "String (e.g. 'Vishrambag')",
  "status": "String ('active' | 'inactive', default: 'active')",
  "role": "String ('agent')",
  "source": "String ('mobile_app')",
  "appDevice": "String (e.g. 'Android App - Samsung Galaxy M34')",
  "appRegisteredAt": "String (ISO 8601 Timestamp, e.g. '2026-09-30T10:30:00.000Z')",
  "lastLoginAt": "String (ISO 8601 Timestamp)",
  "totalClientsHandled": "Number (Default: 0)",
  "totalPropertiesListed": "Number (Default: 0)",
  "totalDealsClosed": "Number (Default: 0)",
  "totalSiteVisits": "Number (Default: 0)",
  "conversionRate": "Number (Percentage, e.g. 75)",
  "growthScore": "Number (Score out of 100, default: 75)",
  "rating": "Number (e.g. 5.0)",
  "notes": "String (Optional notes)",
  "clients": [
    {
      "id": "String (Unique client ID, e.g. 'client-1')",
      "name": "String (Client full name)",
      "mobile": "String (Client 10-digit mobile)",
      "propertyInterest": "String (e.g. '2 BHK Flat in Kupwad')",
      "budget": "String (e.g. '₹ 35 - 40 Lakh')",
      "status": "String ('new' | 'contacted' | 'visit_scheduled' | 'visit_completed' | 'negotiation' | 'deal_closed' | 'dropped')",
      "statusLabelMr": "String (e.g. 'सौदा पूर्ण')",
      "createdAt": "String (ISO 8601 Timestamp)",
      "lastFollowUp": "String (Date string)",
      "notes": "String"
    }
  ],
  "activityLogs": [
    {
      "id": "String (Unique log ID)",
      "action": "String (e.g. 'Mobile App Login')",
      "actionMr": "String (e.g. 'मोबाईल ॲप लॉगिन')",
      "timestamp": "String (ISO 8601 Timestamp)",
      "type": "String ('login' | 'client_added' | 'visit_completed' | 'deal_closed' | 'property_posted')"
    }
  ]
}
```

### Android Kotlin Implementation Guide:

#### 1. Agent Registration / Adding from Mobile App:
```kotlin
fun registerAgentFromMobile(
    uid: String,
    name: String,
    mobile: String,
    email: String?,
    district: String = "Sangli",
    taluka: String = "Miraj",
    cityVillage: String,
    onSuccess: () -> Unit,
    onFailure: (Exception) -> Unit
) {
    val now = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.getDefault()).format(Date())
    val agentData = hashMapOf(
        "id" to uid,
        "name" to name,
        "nameMr" to name,
        "mobile" to mobile,
        "email" to (email ?: ""),
        "district" to district,
        "taluka" to taluka,
        "cityVillage" to cityVillage,
        "role" to "agent",
        "status" to "active",
        "source" to "mobile_app",
        "appDevice" to "${Build.MANUFACTURER} ${Build.MODEL} (Android ${Build.VERSION.RELEASE})",
        "appRegisteredAt" to now,
        "lastLoginAt" to now,
        "totalClientsHandled" to 0,
        "totalPropertiesListed" to 0,
        "totalDealsClosed" to 0,
        "totalSiteVisits" to 0,
        "growthScore" to 75,
        "rating" to 5.0,
        "clients" to arrayListOf<Map<String, Any>>(),
        "activityLogs" to arrayListOf(
            hashMapOf(
                "id" to "act_${System.currentTimeMillis()}",
                "action" to "Agent Registered via Mobile App",
                "actionMr" to "मोबाईल ॲपवरून नवीन एजंट नोंदणी",
                "timestamp" to now,
                "type" to "login"
            )
        )
    )

    // Save directly into 'agents' collection (uses auth UID as document ID)
    FirebaseFirestore.getInstance()
        .collection("agents")
        .document(uid)
        .set(agentData)
        .addOnSuccessListener { onSuccess() }
        .addOnFailureListener { e -> onFailure(e) }
}
```

#### 2. Adding a Client under Agent in Mobile App:
```kotlin
fun addClientForAgent(agentId: String, newClient: Map<String, Any>) {
    FirebaseFirestore.getInstance()
        .collection("agents")
        .document(agentId)
        .update(
            "clients", FieldValue.arrayUnion(newClient),
            "totalClientsHandled", FieldValue.increment(1)
        )
}
```



