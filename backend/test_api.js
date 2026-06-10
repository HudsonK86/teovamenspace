import jwt from 'jsonwebtoken';

const JWT_SECRET = 'kuteovapemen-secret-dev-key';

async function runTest() {
  try {
    // 1. Generate JWT for hudsonnguyen86@gmail.com (Ku Tèo)
    const token = jwt.sign(
      { 
        id: "6aff2e3c-0fcc-4284-bec5-02bf27ef0fe4", 
        email: "hudsonnguyen86@gmail.com", 
        name: "Ku Tèo", 
        role: "partner_1", 
        avatar: "/uploads/avatar-1781115712058-437551817.jpg" 
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    console.log("Generated test token for Ku Tèo.");
    
    // 2. Fetch Events
    const eventsRes = await fetch('http://localhost:5001/api/events', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const events = await eventsRes.json();
    if (!eventsRes.ok) {
      throw new Error("Failed to fetch events: " + JSON.stringify(events));
    }
    if (events.length === 0) {
      console.log("No events to test adding checklist items.");
      return;
    }
    
    const targetEvent = events[0];
    console.log("Testing against event:", targetEvent.title, "(ID:", targetEvent.id + ")");
    
    // 3. Add Checklist Item
    const addRes = await fetch(`http://localhost:5001/api/events/${targetEvent.id}/checklist`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ itemText: 'Test item ' + Date.now() })
    });
    
    const addData = await addRes.json();
    console.log("Add API Response Status:", addRes.status);
    console.log("Add API Response Body:", JSON.stringify(addData, null, 2));
    
  } catch (err) {
    console.error("Test failed:", err);
  }
}

runTest();
