import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView, // Used for safe area on devices with notches/status bars
  Keyboard, // To dismiss the keyboard
  Alert // For showing messages
} from 'react-native';
import QRCode from 'react-native-qrcode-svg'; // Import the QR code library

// The main component of our application
const App = () => {
  // State variable to store the text (URL) entered by the user
  const [inputText, setInputText] = useState('');
  // State variable to store the value that will be converted into a QR code
  // We only update this when the "Generate QR Code" button is pressed
  const [qrValue, setQrValue] = useState('');

  // Function to handle the button press
  const handleGenerateQRCode = () => {
    // Check if the input text is empty
    if (inputText.trim() === '') {
      // If it's empty, show an alert to the user
      Alert.alert('Input Required', 'Please enter a link to convert.');
      return; // Stop the function here
    }
    // If input is not empty, set the qrValue to the inputText
    setQrValue(inputText);
    // Dismiss the keyboard after generating the QR code
    Keyboard.dismiss();
  };

  return (
    // SafeAreaView helps to avoid content overlapping with device notches or status bars
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Link to QR Code Converter</Text>

      {/* TextInput for the user to enter their link */}
      <TextInput
        style={styles.input}
        placeholder="Enter your link here"
        value={inputText}
        onChangeText={setInputText} // Update inputText state as user types
        autoCapitalize="none" // Don't auto-capitalize the input
        keyboardType="url" // Suggest URL keyboard for easier input
        clearButtonMode="while-editing" // Show a clear button on iOS
      />

      {/* Button to trigger the QR code generation */}
      <TouchableOpacity style={styles.button} onPress={handleGenerateQRCode}>
        <Text style={styles.buttonText}>Generate QR Code</Text>
      </TouchableOpacity>

      {/* Conditionally render the QR code only if qrValue is not empty */}
      {qrValue ? (
        <View style={styles.qrCodeContainer}>
          <QRCode
            value={qrValue} // The value to encode in the QR code
            size={200} // Size of the QR code (width and height)
            color="black" // Color of the QR code dots
            backgroundColor="white" // Background color of the QR code
          />
          <Text style={styles.qrValueText}>QR Code for: {qrValue}</Text>
        </View>
      ) : (
        // Show a message if no QR code is generated yet
        <Text style={styles.placeholderText}>
          Enter a link above and tap 'Generate QR Code'
        </Text>
      )}
    </SafeAreaView>
  );
};

// Stylesheet for our components
const styles = StyleSheet.create({
  container: {
    flex: 1, // Make the container take up the whole screen
    justifyContent: 'center', // Center content vertically
    alignItems: 'center', // Center content horizontally
    backgroundColor: '#f0f4f8', // Light background color
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#333',
    textAlign: 'center',
  },
  input: {
    width: '90%', // Take up 90% of the screen width
    height: 50,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 20,
    backgroundColor: '#fff',
    fontSize: 16,
    shadowColor: '#000', // Add a subtle shadow
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3, // For Android shadow
  },
  button: {
    backgroundColor: '#007bff', // Blue button
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 10,
    marginBottom: 30,
    shadowColor: '#007bff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  qrCodeContainer: {
    marginTop: 20,
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  qrValueText: {
    marginTop: 15,
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  placeholderText: {
    fontSize: 16,
    color: '#888',
    marginTop: 50,
    textAlign: 'center',
  },
});

export default App; // Export the App component to be used by React Native
