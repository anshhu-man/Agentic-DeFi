const axios = require('axios');

async function waitForServer(maxAttempts = 10, delay = 2000) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      console.log(`Attempt ${i + 1}: Checking if server is ready...`);
      const response = await axios.get('http://localhost:3000/health');
      
      if (response.status === 200) {
        console.log('✅ Server is ready!');
        console.log('Health status:', response.data);
        return true;
      }
    } catch (error) {
      console.log(`❌ Server not ready yet: ${error.message}`);
      if (i < maxAttempts - 1) {
        console.log(`⏳ Waiting ${delay/1000} seconds before next attempt...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  console.log('❌ Server failed to start after maximum attempts');
  return false;
}

// Run the check
waitForServer().then(ready => {
  if (ready) {
    console.log('\n🚀 Server is ready! You can now run:');
    console.log('   node test-chat-agents.js');
  } else {
    console.log('\n💥 Server startup failed. Check the server logs for errors.');
  }
});
