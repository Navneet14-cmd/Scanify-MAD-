import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  Image,
  Switch,
  useColorScheme,
  StatusBar,
  FlatList,
  Linking,
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native';

// THIS IS THE FIX: Import 'useIsFocused' from react-navigation
import { NavigationContainer, DefaultTheme, DarkTheme, useFocusEffect, useIsFocused } from '@react-navigation/native';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItem } from '@react-navigation/drawer';
import QRCode from 'react-native-qrcode-svg';
import RNPickerSelect from 'react-native-picker-select';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import * as Clipboard from 'expo-clipboard';
import { CameraView, useCameraPermissions } from 'expo-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { GLView } from 'expo-gl';

// --- THEME DEFINITIONS --- //
const CustomDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: '#00ff7f',
    card: 'rgba(24, 24, 24, 0.85)',
    border: 'rgba(0, 255, 127, 0.2)',
    background: '#0a0a0a',
    text: '#E5E5E5',
    liquidBase: [0.05, 0.05, 0.05], 
  },
};
const CustomDefaultTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#2979ff',
    card: 'rgba(255, 255, 255, 0.9)',
    border: 'rgba(0, 0, 0, 0.1)',
    background: '#ffffff',
    liquidBase: [0.9, 0.9, 0.9], 
  },
};

const Drawer = createDrawerNavigator();

// --- COMPONENTS --- //

const LiquidChromeBackground = ({ themeColors }) => {
    const { width, height } = Dimensions.get('window');
    const mousePos = useRef(new Animated.ValueXY({ x: 0.5, y: 0.5 })).current;
    const mouseCoords = useRef({ x: 0.5, y: 0.5 });

    useEffect(() => {
        const listener = mousePos.addListener(value => {
            mouseCoords.current = value;
        });
        return () => {
            mousePos.removeListener(listener);
        };
    }, []);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onPanResponderMove: (e, gesture) => {
                mousePos.setValue({ x: gesture.moveX / width, y: 1 - gesture.moveY / height });
            },
            onPanResponderRelease: () => {
                Animated.spring(mousePos, {
                    toValue: { x: 0.5, y: 0.5 },
                    friction: 4,
                    useNativeDriver: false,
                }).start();
            },
        })
    ).current;

    const onContextCreate = async (gl) => {
        const vertShader = `
            attribute vec2 position;
            varying vec2 vUv;
            void main() {
                vUv = position;
                gl_Position = vec4(position * 2.0 - 1.0, 0.0, 1.0);
            }
        `;

        const fragShader = `
            precision highp float;
            uniform float uTime;
            uniform vec3 uResolution;
            uniform vec3 uBaseColor;
            uniform vec2 uMouse;
            varying vec2 vUv;

            vec4 renderImage(vec2 uvCoord) {
                vec2 fragCoord = uvCoord * uResolution.xy;
                vec2 uv = (2.0 * fragCoord - uResolution.xy) / min(uResolution.x, uResolution.y);

                for (float i = 1.0; i < 10.0; i++){
                    uv.x += 0.3 / i * cos(i * 3.0 * uv.y + uTime + uMouse.x * 3.14159);
                    uv.y += 0.3 / i * cos(i * 3.0 * uv.x + uTime + uMouse.y * 3.14159);
                }

                vec3 color = uBaseColor / abs(sin(uTime - uv.y - uv.x));
                return vec4(color, 1.0);
            }

            void main() {
                gl_FragColor = renderImage(vUv);
            }
        `;

        const vs = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vs, vertShader);
        gl.compileShader(vs);

        const fs = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fs, fragShader);
        gl.compileShader(fs);

        const program = gl.createProgram();
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.linkProgram(program);
        gl.useProgram(program);

        const positionAttrib = gl.getAttribLocation(program, 'position');
        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        const vertices = new Float32Array([0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(positionAttrib);
        gl.vertexAttribPointer(positionAttrib, 2, gl.FLOAT, false, 0, 0);

        const uTime = gl.getUniformLocation(program, 'uTime');
        const uResolution = gl.getUniformLocation(program, 'uResolution');
        const uBaseColor = gl.getUniformLocation(program, 'uBaseColor');
        const uMouse = gl.getUniformLocation(program, 'uMouse');

        let startTime = Date.now();
        const animate = () => {
            gl.clearColor(0, 0, 0, 1);
            gl.clear(gl.COLOR_BUFFER_BIT);

            gl.uniform1f(uTime, (Date.now() - startTime) * 0.001 * 0.2);
            gl.uniform3f(uResolution, gl.drawingBufferWidth, gl.drawingBufferHeight, 1);
            gl.uniform3fv(uBaseColor, themeColors.liquidBase);
            gl.uniform2f(uMouse, mouseCoords.current.x, mouseCoords.current.y);

            gl.drawArrays(gl.TRIANGLES, 0, 6);
            gl.endFrameEXP();
            requestAnimationFrame(animate);
        };
        animate();
    };

    return (
        <View style={StyleSheet.absoluteFill} {...panResponder.panHandlers}>
            <GLView style={{ flex: 1 }} onContextCreate={onContextCreate} />
        </View>
    );
};

function QRGeneratorScreen({ route, navigation, themeColors }) {
  const [type, setType] = useState('url');
  const [inputText, setInputText] = useState('');
  const [ssid, setSsid] = useState('');
  const [password, setPassword] = useState('');
  const [vCardName, setVCardName] = useState('');
  const [vCardPhone, setVCardPhone] = useState('');
  const [vCardEmail, setVCardEmail] = useState('');
  const [qrValue, setQrValue] = useState('');
  const [imageUri, setImageUri] = useState(null);
  const qrRef = useRef();

  useEffect(() => {
    const itemToReload = route.params?.itemToReload;
    if (itemToReload) {
        setInputText(''); setSsid(''); setPassword(''); setVCardName(''); setVCardPhone(''); setVCardEmail('');
        setType(itemToReload.type);
        if (itemToReload.type === 'url' || itemToReload.type === 'text') {
            setInputText(itemToReload.value);
        } else if (itemToReload.type === 'wifi') {
            const parts = itemToReload.value.match(/S:(.*?);P:(.*?);;/);
            if(parts) { setSsid(parts[1] || ''); setPassword(parts[2] || ''); }
        } else if (itemToReload.type === 'vcard') {
            const nameMatch = itemToReload.value.match(/FN:([^\n]*)/);
            const telMatch = itemToReload.value.match(/TEL:([^\n]*)/);
            const emailMatch = itemToReload.value.match(/EMAIL:([^\n]*)/);
            setVCardName(nameMatch ? nameMatch[1].trim() : '');
            setVCardPhone(telMatch ? telMatch[1].trim() : '');
            setVCardEmail(emailMatch ? emailMatch[1].trim() : '');
        }
        navigation.setParams({ itemToReload: null });
    }
  }, [route.params?.itemToReload]);

  const getQRValue = () => {
    switch (type) {
      case 'wifi': return `WIFI:T:WPA;S:${ssid};P:${password};;`;
      case 'vcard': return `BEGIN:VCARD\nVERSION:3.0\nFN:${vCardName}\nTEL:${vCardPhone}\nEMAIL:${vCardEmail}\nEND:VCARD`;
      default: return inputText;
    }
  };
  
  const isQrDataEmpty = () => {
    switch (type) {
      case 'wifi': return !ssid.trim();
      case 'vcard': return !vCardName.trim() && !vCardPhone.trim() && !vCardEmail.trim();
      default: return !inputText.trim();
    }
  };

  useEffect(() => {
    const handler = setTimeout(() => setQrValue(getQRValue()), 300);
    return () => clearTimeout(handler);
  }, [inputText, ssid, password, vCardName, vCardPhone, vCardEmail, type]);

  const storeHistory = async () => {
    const valueToSave = getQRValue();
    if (isQrDataEmpty()) return;
    try {
      const newEntry = { id: Date.now(), type, value: valueToSave, date: new Date().toISOString() };
      const existingHistory = await AsyncStorage.getItem('@qr_history');
      const history = existingHistory ? JSON.parse(existingHistory) : [];
      if (history.length > 0 && history[0].value === newEntry.value) return;
      history.unshift(newEntry);
      await AsyncStorage.setItem('@qr_history', JSON.stringify(history.slice(0, 50)));
    } catch (e) { console.error("Failed to save history.", e); }
  };

  const shareQRCode = async () => {
    if (!qrRef.current || isQrDataEmpty()) return;
    storeHistory();
    qrRef.current.toDataURL(async (data) => {
      const path = `${FileSystem.cacheDirectory}qr-code.png`;
      await FileSystem.writeAsStringAsync(path, data, { encoding: FileSystem.EncodingType.Base64 });
      await Sharing.shareAsync(path, { mimeType: 'image/png', dialogTitle: 'Share your QR Code' });
    });
  };

  const copyToClipboard = () => {
    if (isQrDataEmpty()) return;
    Clipboard.setStringAsync(getQRValue());
    Alert.alert('Copied!', 'QR Code data has been copied to your clipboard.');
  };

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow access to your photo gallery.'); return;
    }
    let result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.5 });
    if (!result.canceled) { setImageUri(result.assets[0].uri); }
  };

  const styles = getStyles(themeColors);
  const pickerStyle = getPickerStyle(themeColors);

  const renderInputs = () => {
    switch (type) {
      case 'wifi': return <>
        <TextInput style={styles.input} placeholder="Network Name (SSID)" value={ssid} onChangeText={setSsid} placeholderTextColor={themeColors.text + '99'} />
        <TextInput style={styles.input} placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry placeholderTextColor={themeColors.text + '99'} />
      </>;
      case 'vcard': return <>
        <TextInput style={styles.input} placeholder="Full Name" value={vCardName} onChangeText={setVCardName} placeholderTextColor={themeColors.text + '99'} />
        <TextInput style={styles.input} placeholder="Phone Number" value={vCardPhone} onChangeText={setVCardPhone} keyboardType="phone-pad" placeholderTextColor={themeColors.text + '99'} />
        <TextInput style={styles.input} placeholder="Email Address" value={vCardEmail} onChangeText={setVCardEmail} keyboardType="email-address" placeholderTextColor={themeColors.text + '99'} />
      </>;
      default: return <TextInput style={styles.input} placeholder={`Enter ${type} here`} value={inputText} onChangeText={setInputText} placeholderTextColor={themeColors.text + '99'} />;
    }
  };

  return (
    <View style={styles.screenContainer}>
        <LiquidChromeBackground themeColors={themeColors} />
        <SafeAreaView style={styles.container}>
            <Text style={styles.title}>QR Code Generator</Text>
            <RNPickerSelect value={type} onValueChange={setType} items={[{ label: '🔗 URL', value: 'url' }, { label: '✍️ Text', value: 'text' }, { label: '📶 Wi-Fi', value: 'wifi' }, { label: '👤 Contact Card (vCard)', value: 'vcard' }]} style={pickerStyle} useNativeAndroidPickerStyle={false} placeholder={{ label: 'Select a QR code type...', value: null }} />
            {renderInputs()}
            <TouchableOpacity style={styles.actionButton} onPress={pickImage}><Text style={styles.actionButtonText}>{imageUri ? 'Change Center Image' : 'Add Center Image'}</Text></TouchableOpacity>
            {imageUri && (<View style={styles.imagePreviewContainer}><Image source={{ uri: imageUri }} style={styles.imagePreview} /><TouchableOpacity style={styles.removeButton} onPress={() => setImageUri(null)}><Text style={styles.removeButtonText}>Remove</Text></TouchableOpacity></View>)}
            
            <View style={[styles.card, { marginTop: 15, padding: 25 }]}>
              {!isQrDataEmpty() ? 
                <QRCode 
                  value={getQRValue()} 
                  size={220} 
                  getRef={qrRef} 
                  logo={imageUri ? { uri: imageUri } : undefined} 
                  logoSize={45} 
                  logoBackgroundColor="transparent" 
                  backgroundColor="transparent" 
                  color={themeColors.text}
                  ecl={imageUri ? 'H' : 'M'}
                /> 
                : 
                <View style={styles.placeholderQR}><Text style={styles.placeholderText}>Enter input to generate QR Code</Text></View>
              }
            </View>

            {!isQrDataEmpty() && (
              <View style={styles.buttonRow}>
                <TouchableOpacity style={styles.actionButton} onPress={copyToClipboard}><Text style={styles.actionButtonText}>Copy</Text></TouchableOpacity>
                <TouchableOpacity style={styles.actionButton} onPress={shareQRCode}><Text style={styles.actionButtonText}>Share</Text></TouchableOpacity>
              </View>
            )}
        </SafeAreaView>
    </View>
  );
}

function QRScannerScreen({ themeColors }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const styles = getStyles(themeColors);
  
  // THIS IS THE FIX: Check if the screen is currently focused.
  const isFocused = useIsFocused();

  // This effect resets the scanner's state when you navigate back to the screen.
  useFocusEffect(
    React.useCallback(() => {
      setScanned(false);
    }, [])
  );

  const handleBarCodeScanned = (scanningResult) => {
    if (scanned) {
      return; // Prevent multiple scans from being handled
    }
    if (scanningResult.data) {
        setScanned(true);
        const data = scanningResult.data;
        Alert.alert('QR Code Scanned!', `Data: ${data}`, [
          { text: 'Scan Again', onPress: () => setScanned(false) },
          Linking.canOpenURL(data) ? { text: 'Open Link', onPress: () => Linking.openURL(data) } : null,
          { text: 'Copy', onPress: () => { Clipboard.setStringAsync(data); Alert.alert('Copied!'); }},
          { text: 'OK', style: 'cancel' },
        ].filter(Boolean));
    }
  };

  if (!permission) {
    return <View style={[styles.container, { justifyContent: 'center' }]}><Text style={{ color: themeColors.text }}>Requesting camera permission...</Text></View>;
  }

  if (!permission.granted) {
    return (
      <View style={styles.screenContainer}>
        <LiquidChromeBackground themeColors={themeColors} />
        <View style={[styles.container, { justifyContent: 'center' }]}>
          <Text style={[styles.bio, { paddingHorizontal: 20 }]}>We need your permission to show the camera.</Text>
          <TouchableOpacity style={[styles.actionButton, { marginTop: 20 }]} onPress={requestPermission}>
            <Text style={styles.actionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.scannerContainer}>
      {/* THIS IS THE FIX: Only render the CameraView when the screen is focused. */}
      {isFocused && (
        <>
          <CameraView 
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned} 
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }} 
            style={StyleSheet.absoluteFillObject} 
          />
          <View style={styles.scannerOverlay}>
            <Text style={styles.scannerText}>Scan a QR Code</Text>
            <View style={styles.scannerBox} />
          </View>
          {scanned && (
            <TouchableOpacity style={styles.scanAgainButton} onPress={() => setScanned(false)}>
              <Text style={styles.actionButtonText}>Tap to Scan Again</Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </View>
  );
}

function HistoryScreen({ navigation, themeColors }) {
  const [history, setHistory] = useState([]);
  const styles = getStyles(themeColors);

  useFocusEffect(React.useCallback(() => {
    const loadHistory = async () => {
      const storedHistory = await AsyncStorage.getItem('@qr_history');
      if (storedHistory) setHistory(JSON.parse(storedHistory));
    };
    loadHistory();
  }, []));

  const clearHistory = () => {
    Alert.alert("Clear History", "Are you sure you want to delete all history?", [{ text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive", onPress: async () => { await AsyncStorage.removeItem('@qr_history'); setHistory([]); }},]);
  };

  const handleItemPress = (item) => { navigation.navigate('QRGenerator', { itemToReload: item }); };
  
  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.historyItem} onPress={() => handleItemPress(item)}>
      <Text style={styles.historyType}>{item.type.toUpperCase()}</Text>
      <Text style={styles.historyValue} numberOfLines={1}>{item.value.replace(/\n/g, ' ')}</Text>
      <Text style={styles.historyDate}>{new Date(item.date).toLocaleDateString()}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.screenContainer}>
        <LiquidChromeBackground themeColors={themeColors} />
        <SafeAreaView style={styles.container}>
            <View style={styles.historyHeader}><Text style={styles.title}>History</Text>{history.length > 0 && <TouchableOpacity onPress={clearHistory}><Text style={styles.clearButtonText}>Clear All</Text></TouchableOpacity>}</View>
            <FlatList data={history} renderItem={renderItem} keyExtractor={(item) => item.id.toString()} style={{ width: '100%' }} ListEmptyComponent={<View style={[styles.card, { padding: 25 }]}><Text style={styles.bio}>🗂️ No history yet.</Text></View>} />
        </SafeAreaView>
    </View>
  );
}

function HomeScreen({ navigation, themeColors }) {
    const styles = getStyles(themeColors);
    const floatAnim = useRef(new Animated.Value(0)).current;
    const entryAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.loop(Animated.sequence([
            Animated.timing(floatAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
            Animated.timing(floatAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
        ])).start();
        Animated.timing(entryAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();
    }, []);

    const floatingStyle = { transform: [{ translateY: floatAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 10] }) }] };
    const entryStyle = { opacity: entryAnim, transform: [{ translateY: entryAnim.interpolate({ inputRange: [0, 1], outputRange: [50, 0] }) }] };

    return (
      <View style={styles.screenContainer}>
        <LiquidChromeBackground themeColors={themeColors} />
        <SafeAreaView style={styles.container}>
          <Animated.View style={[styles.card, floatingStyle, entryStyle, {marginTop: 20}]}>
            <Image source={{ uri: 'https://instagram.fagr1-2.fna.fbcdn.net/v/t51.2885-19/368152426_1328993228011266_2840224837132296428_n.jpg?stp=dst-jpg_s320x320_tt6&efg=eyJ2ZW5jb2RlX3RhZyI6InByb2ZpbGVfcGljLmRqYW5nby4xMDU2LmMyIn0&_nc_ht=instagram.fagr1-2.fna.fbcdn.net&_nc_cat=106&_nc_oc=Q6cZ2QEvsHuy8eHEGUd8IhEwuDdduHHj22dscA877ODR4KDjBFRk4aAeT9KveuzqyP3KkhwhVivAVnXhLKBVQAUAUUl3&_nc_ohc=VQbcOZqK20MQ7kNvwH9Ot05&_nc_gid=38zUXno6-NTe6DlMffmB6A&edm=AOQ1c0wBAAAA&ccb=7-5&oh=00_AfTjfaD7WZgbvuezCBA3cwML6Fiqrq6C7On-EuzXyF8DUQ&oe=688E5D79&_nc_sid=8b3546' }} style={styles.profileImage} />
            <Text style={styles.name}>SCANIFY</Text>
            <Text style={styles.username}>@Navneet14-cmd</Text>
            <Text style={styles.bio}>Welcome to Scanify! 🚀 Generate, scan, and manage QR codes with a sleek interface.</Text>
          </Animated.View>

          <Animated.View style={[entryStyle, {width: '100%'}]}>
            <Text style={styles.quickActionsTitle}>Quick Actions</Text>
            <View style={styles.quickActionsContainer}>
                <TouchableOpacity style={styles.quickActionCard} onPress={() => navigation.navigate('QRGenerator')}>
                    <Ionicons name="qr-code-outline" size={40} color={themeColors.primary} />
                    <Text style={styles.quickActionText}>Generate</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.quickActionCard} onPress={() => navigation.navigate('QRScanner')}>
                    <Ionicons name="scan-outline" size={40} color={themeColors.primary} />
                    <Text style={styles.quickActionText}>Scan</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.quickActionCard} onPress={() => navigation.navigate('History')}>
                    <Ionicons name="time-outline" size={40} color={themeColors.primary} />
                    <Text style={styles.quickActionText}>History</Text>
                </TouchableOpacity>
            </View>
          </Animated.View>
        </SafeAreaView>
      </View>
    );
}

function SettingsScreen({ isDark, setIsDark, themeColors }) {
    const styles = getStyles(themeColors);
    return (
      <View style={styles.screenContainer}>
        <LiquidChromeBackground themeColors={themeColors} />
        <SafeAreaView style={styles.container}>
            <Text style={styles.title}>Settings</Text>
            <View style={[styles.card, { paddingVertical: 20, paddingHorizontal: 25, width: '100%' }]}>
                <View style={styles.settingRow}>
                    <Text style={styles.settingText}>🌙 Dark Mode</Text>
                    <Switch value={isDark} onValueChange={setIsDark} trackColor={{ false: '#767577', true: '#00ff7f' }} thumbColor={isDark ? themeColors.primary : '#f4f3f4'} />
                </View>
            </View>
        </SafeAreaView>
      </View>
    );
}

function CustomDrawerContent(props) {
  const { themeColors } = props;
  const styles = getStyles(themeColors);
  return (
    <View style={{ flex: 1 }}>
      <DrawerContentScrollView {...props} style={{ backgroundColor: themeColors.card }}>
        <View style={styles.drawerHeader}><Text style={styles.title}>SCANIFY</Text></View>
        <DrawerItem label="Home" labelStyle={{ color: themeColors.text, fontWeight: '600' }} onPress={() => props.navigation.navigate('Home')} />
        <DrawerItem label="QR Code Generator" labelStyle={{ color: themeColors.text, fontWeight: '600' }} onPress={() => props.navigation.navigate('QRGenerator')} />
        <DrawerItem label="QR Code Scanner" labelStyle={{ color: themeColors.text, fontWeight: '600' }} onPress={() => props.navigation.navigate('QRScanner')} />
        <DrawerItem label="History" labelStyle={{ color: themeColors.text, fontWeight: '600' }} onPress={() => props.navigation.navigate('History')} />
        <DrawerItem label="Settings" labelStyle={{ color: themeColors.text, fontWeight: '600' }} onPress={() => props.navigation.navigate('Settings')} />
      </DrawerContentScrollView>
    </View>
  );
}

// --- APP ROOT --- //
export default function App() {
  const systemScheme = useColorScheme();
  const [isDark, setIsDark] = useState(systemScheme === 'dark');
  const theme = isDark ? CustomDarkTheme : CustomDefaultTheme;

  return (
    <>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.background} />
      <NavigationContainer theme={theme}>
        <Drawer.Navigator 
            drawerContent={(props) => <CustomDrawerContent {...props} themeColors={theme.colors} />} 
            screenOptions={{ headerShown: false, drawerStyle: { backgroundColor: 'transparent', width: 260 } }}
        >
          <Drawer.Screen name="Home">{(props) => <HomeScreen {...props} themeColors={theme.colors} />}</Drawer.Screen>
          <Drawer.Screen name="QRGenerator">{(props) => <QRGeneratorScreen {...props} themeColors={theme.colors} />}</Drawer.Screen>
          <Drawer.Screen name="QRScanner">{(props) => <QRScannerScreen {...props} themeColors={theme.colors} />}</Drawer.Screen>
          <Drawer.Screen name="History">{(props) => <HistoryScreen {...props} themeColors={theme.colors} />}</Drawer.Screen>
          <Drawer.Screen name="Settings">{(props) => <SettingsScreen {...props} isDark={isDark} setIsDark={setIsDark} themeColors={theme.colors} />}</Drawer.Screen>
        </Drawer.Navigator>
      </NavigationContainer>
    </>
  );
}

// --- STYLESHEETS --- //
const getStyles = (themeColors) => StyleSheet.create({
    screenContainer: { flex: 1, backgroundColor: themeColors.background },
    scannerContainer: { flex: 1, flexDirection: 'column', justifyContent: 'center' },
    scannerOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
    scannerBox: { width: 250, height: 250, borderWidth: 2, borderColor: '#fff', borderRadius: 10 },
    scannerText: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 20, backgroundColor: 'rgba(0,0,0,0.7)', padding: 10, borderRadius: 5 },
    scanAgainButton: { position: 'absolute', bottom: 50, alignSelf: 'center', backgroundColor: themeColors.primary, paddingVertical: 12, paddingHorizontal: 25, borderRadius: 30 },
    historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', paddingBottom: 10 },
    clearButtonText: { color: themeColors.primary, fontWeight: '600', fontSize: 16, padding: 10 },
    historyItem: { backgroundColor: themeColors.card, padding: 15, borderRadius: 12, marginBottom: 10, width: '100%', borderWidth: 1, borderColor: themeColors.border },
    historyType: { color: themeColors.primary, fontWeight: 'bold', fontSize: 14, marginBottom: 4 },
    historyValue: { color: themeColors.text, fontSize: 16, marginBottom: 8 },
    historyDate: { color: themeColors.text + '99', fontSize: 12, textAlign: 'right' },
    container: { flex: 1, alignItems: 'center', paddingTop: (StatusBar.currentHeight || 0) + 20, paddingHorizontal: 20 },
    card: { backgroundColor: themeColors.card, borderRadius: 20, padding: 20, width: '95%', alignItems: 'center', borderWidth: 1, borderColor: themeColors.border, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 8 },
    title: { fontSize: 32, fontWeight: 'bold', color: themeColors.text, marginBottom: 25, textAlign: 'center' },
    name: { fontSize: 24, fontWeight: 'bold', color: themeColors.text },
    username: { fontSize: 16, color: themeColors.text + 'aa', marginBottom: 12 },
    bio: { fontSize: 15, textAlign: 'center', color: themeColors.text, lineHeight: 22 },
    input: { width: '100%', height: 50, backgroundColor: themeColors.background, borderRadius: 12, paddingHorizontal: 15, marginBottom: 15, fontSize: 16, color: themeColors.text, borderWidth: 1, borderColor: themeColors.border },
    imagePreviewContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: themeColors.card, padding: 8, borderRadius: 12, marginBottom: 10 },
    imagePreview: { width: 40, height: 40, borderRadius: 8 },
    removeButton: { marginLeft: 10, padding: 8 },
    removeButtonText: { color: themeColors.primary, fontWeight: '600' },
    placeholderQR: { width: 220, height: 220, justifyContent: 'center', alignItems: 'center', borderRadius: 12, backgroundColor: themeColors.background + '99' },
    placeholderText: { color: themeColors.text, textAlign: 'center', padding: 20 },
    buttonRow: { flexDirection: 'row', marginTop: 25, gap: 15 },
    actionButton: { backgroundColor: themeColors.primary, paddingVertical: 12, paddingHorizontal: 25, borderRadius: 30, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 5, elevation: 5 },
    actionButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    profileImage: { width: 120, height: 120, borderRadius: 60, marginBottom: 15, borderWidth: 3, borderColor: themeColors.primary },
    settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' },
    settingText: { fontSize: 18, color: themeColors.text, fontWeight: '500' },
    drawerHeader: { padding: 20, borderBottomWidth: 1, borderBottomColor: themeColors.border },
    quickActionsTitle: { fontSize: 22, fontWeight: 'bold', color: themeColors.text, marginTop: 30, marginBottom: 15, alignSelf: 'flex-start' },
    quickActionsContainer: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
    quickActionCard: { backgroundColor: themeColors.card, borderRadius: 15, padding: 15, alignItems: 'center', justifyContent: 'center', width: '31%', aspectRatio: 1, borderWidth: 1, borderColor: themeColors.border },
    quickActionText: { color: themeColors.text, fontWeight: '600', marginTop: 10, fontSize: 14 },
});

const getPickerStyle = (themeColors) => StyleSheet.create({
    inputIOS: { fontSize: 16, paddingVertical: 12, paddingHorizontal: 15, borderWidth: 1, borderColor: themeColors.border, borderRadius: 12, color: themeColors.text, backgroundColor: themeColors.background, marginBottom: 15 },
    inputAndroid: { fontSize: 16, paddingHorizontal: 15, paddingVertical: 12, borderWidth: 1, borderColor: themeColors.border, borderRadius: 12, color: themeColors.text, backgroundColor: themeColors.background, marginBottom: 15 },
    iconContainer: { top: 15, right: 15 },
});