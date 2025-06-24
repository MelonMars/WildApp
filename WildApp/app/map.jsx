import React, { useState, useEffect, useRef, useMemo, useCallback, use } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Dimensions
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { common_styles } from './styles';
import { useRouter } from 'expo-router';

const { width, height } = Dimensions.get('window');

const colors = {
  forestGreen: '#2d5016',
  mossGreen: '#5c8a3a',
  earthBrown: '#8b4513',
  sunsetOrange: '#d2691e',
  warmCream: '#f5deb3',
  deepWood: '#654321',
  vintage: '#daa520',
  shadow: 'rgba(45, 80, 22, 0.3)',
  cardShadow: 'rgba(45, 80, 22, 0.2)',
};

const retrostyle = [
  {
    "featureType": "all",
    "elementType": "labels.text.fill",
    "stylers": [{"color": "#654321"}]
  },
  {
    "featureType": "landscape",
    "elementType": "all",
    "stylers": [{"color": "#f5deb3"}]
  },
  {
    "featureType": "poi",
    "elementType": "all",
    "stylers": [{"visibility": "off"}]
  },
  {
    "featureType": "road",
    "elementType": "all",
    "stylers": [{"saturation": -100}, {"lightness": 45}]
  },
  {
    "featureType": "road.highway",
    "elementType": "all",
    "stylers": [{"visibility": "simplified"}]
  },
  {
    "featureType": "road.arterial",
    "elementType": "labels.icon",
    "stylers": [{"visibility": "off"}]
  },
  {
    "featureType": "transit",
    "elementType": "all",
    "stylers": [{"visibility": "off"}]
  },
  {
    "featureType": "water",
    "elementType": "all",
    "stylers": [{"color": "#5c8a3a"}, {"visibility": "on"}]
  }
];

const search_options = [
  { key: 'parks', emoji: '🌳', label: 'Parks', tag: 'leisure=park' },
  { key: 'trails', emoji: '🥾', label: 'Trails', tag: 'highway=footway' },
  { key: 'forests', emoji: '🌲', label: 'Forests', tag: 'landuse=forest' },
  { key: 'camping', emoji: '🏕️', label: 'Camping', tag: 'tourism=camp_site' },
  { key: 'viewpoints', emoji: '🏔️', label: 'Viewpoints', tag: 'tourism=viewpoint' },
  { key: 'lakes', emoji: '🏞️', label: 'Lakes', tag: 'natural=water' },
  { key: 'mountains', emoji: '⛰️', label: 'Mountains', tag: 'natural=peak' },
  { key: 'restaurants', emoji: '🍽️', label: 'Restaurants', tag: 'amenity=restaurant' },
  { key: 'cafes', emoji: '☕', label: 'Cafes', tag: 'amenity=cafe' },
  { key: 'shops', emoji: '🛍️', label: 'Shops', tag: 'shop' },
  { key: 'malls', emoji: '🏬', label: 'Malls', tag: 'shop=mall' },
  { key: 'gyms', emoji: '💪', label: 'Gyms', tag: 'leisure=fitness_centre' },
  { key: 'libraries', emoji: '📚', label: 'Libraries', tag: 'amenity=library' },
  { key: 'gas', emoji: '⛽', label: 'Gas Stations', tag: 'amenity=fuel' },
];

const MapPage = () => {
  const params = useLocalSearchParams();
  const mapRef = useRef(null);
  
  const initialQuery = params.searchFor || 'parks';
  const challenge = params.challenge || null;
  const category = params.category || null;
  const router = useRouter();
  const initialOption = search_options.find(opt => opt.key === initialQuery) || search_options[0];
  
  const [userLocation, setUserLocation] = useState(null);
  const [places, setPlaces] = useState([]);
  const [selectedOption, setSelectedOption] = useState(initialOption);
  const [currentSearchTerm, setCurrentSearchTerm] = useState(initialOption.label);
  const [loading, setLoading] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [dropdownVisible, setDropdownVisible] = useState(false);

  const requestLocationPermission = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Trail Access Denied', 'We need your location to find nearby natural spots');
        return;
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Trail Error', 'Failed to get your location');
      console.error(error);
    }
  }, []);

  const searchNearbyPlaces = useCallback(async (option) => {
    if (!userLocation) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    setCurrentSearchTerm(option.label);
    
    try {
      await searchWithOverpassAPI(option);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error searching places:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Search Error', 'Failed to find nearby spots');
    } finally {
      setLoading(false);
    }
  }, [userLocation]);

  const searchWithOverpassAPI = useCallback(async (option) => {
    const bbox = [
      userLocation.latitude - 0.008,
      userLocation.longitude - 0.008,
      userLocation.latitude + 0.008,
      userLocation.longitude + 0.008
    ];

    const overpassQuery = `
      [out:json][timeout:15];
      (
        node[${option.tag}](${bbox.join(',')});
        way[${option.tag}](${bbox.join(',')});
      );
      out center meta;
    `;

    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: overpassQuery
    });

    const data = await response.json();
    
    const formattedPlaces = data.elements
      .slice(0, 30) 
      .map((element, index) => {
        const lat = element.lat || element.center?.lat;
        const lon = element.lon || element.center?.lon;
        
        return {
          id: element.id || index,
          name: element.tags?.name || element.tags?.brand || `${option.label} ${index + 1}`,
          latitude: lat,
          longitude: lon,
          types: [element.tags?.amenity || element.tags?.leisure || element.tags?.shop || 'place'],
          vicinity: element.tags?.['addr:street'] || element.tags?.['addr:city'] || 'Wilderness location',
          phone: element.tags?.phone,
          website: element.tags?.website,
          openingHours: element.tags?.opening_hours,
        };
      })
      .filter(place => place.latitude && place.longitude);

    setPlaces(formattedPlaces);
  }, [userLocation]);

  const getMarkerColor = useCallback((types) => {
    const typeString = Array.isArray(types) ? types.join(' ').toLowerCase() : types.toLowerCase();
    
    if (typeString.includes('park') || typeString.includes('forest') || typeString.includes('trail')) return colors.forestGreen;
    if (typeString.includes('camping') || typeString.includes('viewpoint')) return colors.earthBrown;
    if (typeString.includes('water') || typeString.includes('lake')) return colors.mossGreen;
    if (typeString.includes('restaurant') || typeString.includes('cafe')) return colors.sunsetOrange;
    if (typeString.includes('shop') || typeString.includes('mall')) return colors.vintage;
    return colors.deepWood;
  }, []);

  const handleMarkerPress = useCallback((place) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedPlace(place);
    mapRef.current?.animateToRegion({
      latitude: place.latitude,
      longitude: place.longitude,
      latitudeDelta: 0.005,
      longitudeDelta: 0.005,
    }, 500); 
  }, []);

  const handleSearch = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setDropdownVisible(false);
    searchNearbyPlaces(selectedOption);
  }, [selectedOption, searchNearbyPlaces]);

  const handleOptionSelect = useCallback((option) => {
    Haptics.selectionAsync();
    setSelectedOption(option);
    setDropdownVisible(false);
    handleSearch();
  }, []);

  const toggleDropdown = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDropdownVisible(!dropdownVisible);
  }, [dropdownVisible]);

  const handlePlaceCardClose = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedPlace(null);
  }, []);

  useEffect(() => {
    requestLocationPermission();
  }, [requestLocationPermission]);

  useEffect(() => {
    if (userLocation) {
      searchNearbyPlaces(selectedOption);
    }
  }, [userLocation]);

  const placeCard = useMemo(() => {
    if (!selectedPlace) return null;

    return (
      <View style={styles.placeCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.placeName}>{selectedPlace.name}</Text>
          <TouchableOpacity onPress={handlePlaceCardClose}>
            <Ionicons name="close-circle" size={28} color={colors.earthBrown} />
          </TouchableOpacity>
        </View>
        <Text style={styles.placeAddress}>{selectedPlace.vicinity}</Text>
        {selectedPlace.rating && (
          <View style={styles.ratingContainer}>
            <Ionicons name="leaf" size={16} color={colors.forestGreen} />
            <Text style={styles.rating}>{selectedPlace.rating}/5 trails</Text>
          </View>
        )}
        <View style={styles.cardFooter}>
          <Text style={styles.cardSubtext}>📍 Nature Spot</Text>
        </View>
      </View>
    );
  }, [selectedPlace, handlePlaceCardClose]);

  const markers = useMemo(() => {
    return places.map((place) => (
      <Marker
        key={place.id}
        coordinate={{
          latitude: place.latitude,
          longitude: place.longitude,
        }}
        title={place.name}
        description={place.vicinity}
        pinColor={getMarkerColor(place.types)}
        onPress={() => handleMarkerPress(place)}
      />
    ));
  }, [places, getMarkerColor, handleMarkerPress]);

  if (!userLocation) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.forestGreen} />
        <Text style={styles.loadingText}>🧭 Finding your trail...</Text>
      </View>
    );
  }

return (
    <View style={styles.container}>
        <View style={styles.headerContainer}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 15 }}>
                {challenge && (
                    <TouchableOpacity
                        style={[common_styles.ghostButton, styles.backButton, { marginRight: 10 }]}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            router.navigate({
                                pathname: '/challenge',
                                params: { challenge, category },
                            });
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }}
                    >
                        <Text style={common_styles.ghostButtonText}>← Challenge</Text>
                    </TouchableOpacity>
                )}
                {!challenge && (<TouchableOpacity
                        style={[common_styles.ghostButton, styles.backButton, { marginRight: 10 }]}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            router.navigate({
                                pathname: '/',
                            });
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }}
                    >
                        <Text style={common_styles.ghostButtonText}>← 🏠 Home</Text>
                    </TouchableOpacity>)}
                <Text style={styles.headerTitle}>🌲 Wild</Text>
            </View>
            <View style={styles.searchContainer}>
                <TouchableOpacity style={styles.dropdownButton} onPress={toggleDropdown}>
                    <Text style={styles.dropdownButtonText}>
                        {selectedOption.emoji} {selectedOption.label}
                    </Text>
                    <Ionicons 
                        name={dropdownVisible ? "chevron-up" : "chevron-down"} 
                        size={20} 
                        color={colors.earthBrown} 
                    />
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
                    {loading ? (
                        <ActivityIndicator size="small" color={colors.warmCream} />
                    ) : (
                        <Ionicons name="compass" size={20} color={colors.warmCream} />
                    )}
                </TouchableOpacity>
            </View>

            {dropdownVisible && (
                <View style={styles.dropdown}>
                    <ScrollView style={styles.dropdownScroll} showsVerticalScrollIndicator={false}>
                        {search_options.map((option) => (
                            <TouchableOpacity
                                key={option.key}
                                style={[
                                    styles.dropdownItem,
                                    selectedOption.key === option.key && styles.dropdownItemSelected
                                ]}
                                onPress={() => handleOptionSelect(option)}
                            >
                                <Text style={styles.dropdownItemText}>
                                    {option.emoji} {option.label}
                                </Text>
                                {selectedOption.key === option.key && (
                                    <Ionicons name="checkmark" size={20} color={colors.forestGreen} />
                                )}
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            )}
        </View>

        <MapView
            ref={mapRef}
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            initialRegion={userLocation}
            showsUserLocation={true}
            showsMyLocationButton={true}
            customMapStyle={retrostyle}
            loadingEnabled={true}
            loadingIndicatorColor={colors.forestGreen}
            maxZoomLevel={18}
            minZoomLevel={10}
        >
            {markers}
        </MapView>

        {placeCard}

        {places.length > 0 && (
            <View style={styles.resultsCounter}>
                <Text style={styles.resultsText}>
                    🏕️ {places.length} {currentSearchTerm} discovered
                </Text>
            </View>
        )}

        <View style={styles.cornerDecoration}>
            <Text style={styles.decorationText}>🌿</Text>
        </View>
    </View>
);
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.warmCream,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.warmCream,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 18,
    color: colors.deepWood,
    fontFamily: 'serif',
    fontWeight: '600',
  },
  headerContainer: {
    backgroundColor: colors.forestGreen,
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 3,
    borderBottomColor: colors.earthBrown,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.warmCream,
    textAlign: 'center',
    marginBottom: 15,
    fontFamily: 'serif',
    textShadowColor: colors.shadow,
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 3,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dropdownButton: {
    flex: 1,
    height: 50,
    borderWidth: 2,
    borderColor: colors.earthBrown,
    borderRadius: 25,
    paddingHorizontal: 20,
    backgroundColor: colors.warmCream,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  dropdownButtonText: {
    fontSize: 16,
    color: colors.deepWood,
    fontFamily: 'serif',
    fontWeight: '600',
  },
  searchButton: {
    width: 50,
    height: 50,
    backgroundColor: colors.sunsetOrange,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
    borderWidth: 2,
    borderColor: colors.earthBrown,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 5,
  },
  dropdown: {
    marginTop: 10,
    backgroundColor: colors.warmCream,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: colors.earthBrown,
    maxHeight: 200,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  dropdownScroll: {
    maxHeight: 196,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.mossGreen,
  },
  dropdownItemSelected: {
    backgroundColor: colors.mossGreen + '20',
  },
  dropdownItemText: {
    fontSize: 16,
    color: colors.deepWood,
    fontFamily: 'serif',
    fontWeight: '500',
  },
  map: {
    flex: 1,
  },
  placeCard: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    backgroundColor: colors.warmCream,
    borderRadius: 20,
    padding: 25,
    borderWidth: 3,
    borderColor: colors.earthBrown,
    shadowColor: colors.cardShadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  placeName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.forestGreen,
    flex: 1,
    fontFamily: 'serif',
  },
  placeAddress: {
    fontSize: 15,
    color: colors.deepWood,
    marginBottom: 10,
    fontStyle: 'italic',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  rating: {
    marginLeft: 8,
    fontSize: 15,
    color: colors.forestGreen,
    fontWeight: '600',
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: colors.mossGreen,
    paddingTop: 10,
  },
  cardSubtext: {
    fontSize: 14,
    color: colors.earthBrown,
    fontStyle: 'italic',
  },
  resultsCounter: {
    position: 'absolute',
    top: 150,
    left: 20,
    backgroundColor: colors.earthBrown,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.warmCream,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 6,
  },
  resultsText: {
    color: colors.warmCream,
    fontSize: 13,
    fontWeight: 'bold',
    fontFamily: 'serif',
  },
  cornerDecoration: {
    position: 'absolute',
    top: 200,
    right: 20,
    width: 40,
    height: 40,
    backgroundColor: colors.mossGreen,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.warmCream,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  decorationText: {
    fontSize: 20,
  },
});

export default MapPage;