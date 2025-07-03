import { StyleSheet, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

const colors = {
  darkBrown: '#2C1810',
  mediumBrown: '#3D2914',
  lightBrown: '#8B4513',
  tan: '#D2B48C',
  cream: '#F5F5DC',
  beige: '#F0E68C',
  
  forestGreen: '#228B22',
  oliveGreen: '#6B8E23',
  mossGreen: '#9ACD32',
  
  polaroidWhite: '#FEFEFE',
  offWhite: '#F8F8F8',
  lightGray: '#E8E8E8',
  mediumGray: '#CCCCCC',
  darkGray: '#666666',
  
  vintageRed: '#B22222',
  dustyRed: '#CD5C5C',
  
  vintageOrange: '#D2691E',
  peach: '#FFDAB9',
  
  deepShadow: '#1A1A1A',
  softShadow: 'rgba(0,0,0,0.3)',
};

const typography = {
  fontFamily: 'Courier New',
  
  headerLarge: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 3,
  },
  headerMedium: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 2,
  },
  headerSmall: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1,
  },
  
  bodyLarge: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
  },
  bodyMedium: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  bodySmall: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 18,
  },
  
  stamp: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
};

const shadows = {
  polaroidShadow: {
    shadowColor: colors.deepShadow,
    shadowOffset: { width: 3, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 10,
  },
  
  lightShadow: {
    shadowColor: colors.deepShadow,
    shadowOffset: { width: 2, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  
  deepShadow: {
    shadowColor: colors.deepShadow,
    shadowOffset: { width: 5, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 15,
  },
};

const components = {
  polaroidFrame: {
    backgroundColor: colors.polaroidWhite,
    padding: 15,
    paddingBottom: 25,
    borderWidth: 1,
    borderColor: colors.mediumGray,
    ...shadows.polaroidShadow,
  },
  
  photoPlaceholder: {
    backgroundColor: colors.lightGray,
    borderWidth: 1,
    borderColor: colors.mediumGray,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  primaryButton: {
    backgroundColor: colors.forestGreen,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderWidth: 3,
    borderColor: colors.oliveGreen,
  },
  
  secondaryButton: {
    backgroundColor: colors.lightBrown,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderWidth: 2,
    borderColor: colors.tan,
  },
  
  dangerButton: {
    backgroundColor: colors.vintageRed,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderWidth: 2,
    borderColor: colors.dustyRed,
  },
  
  ghostButton: {
    backgroundColor: 'transparent',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderWidth: 2,
    borderColor: colors.darkGray,
  },
};

export const common_styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.mediumBrown,
  },
  backgroundTexture: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.mediumBrown,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: `${colors.mediumBrown}E6`,
    borderBottomWidth: 3,
    borderBottomColor: colors.lightBrown,
  },
  headerTitle: {
    ...typography.headerLarge,
    color: colors.tan,
    textAlign: 'center',
    fontFamily: typography.fontFamily,
  },
  headerSubtitle: {
    ...typography.bodyMedium,
    color: colors.peach,
    textAlign: 'center',
    marginTop: 5,
  },
  headerLine: {
    height: 3,
    backgroundColor: colors.lightBrown,
    marginTop: 15,
    marginHorizontal: 40,
  },
  categoryLabel: {
    ...typography.label,
    color: colors.vintageOrange,
    textAlign: 'center',
  },
  categoryBadge: {
    backgroundColor: colors.forestGreen,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.oliveGreen,
  },
  categoryBadgeText: {
    ...typography.stamp,
    color: colors.polaroidWhite,
  },
  polaroidContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  polaroidSmall: {
    ...components.polaroidFrame,
    width: width * 0.45,
    padding: 12,
    paddingBottom: 20,
    transform: [{ rotate: '-1deg' }],
  },
  polaroidMedium: {
    ...components.polaroidFrame,
    width: width * 0.7,
    transform: [{ rotate: '1deg' }],
  },
  polaroidLarge: {
    ...components.polaroidFrame,
    width: width * 0.85,
    transform: [{ rotate: '-0.5deg' }],
  },
  photoFrame: {
    ...components.photoPlaceholder,
    marginBottom: 10,
  },
  photoSmall: {
    ...components.photoPlaceholder,
    height: 120,
  },
  photoMedium: {
    ...components.photoPlaceholder,
    height: 180,
  },
  photoLarge: {
    ...components.photoPlaceholder,
    height: 250,
  },
  photoPlaceholderContent: {
    alignItems: 'center',
  },
  photoPlaceholderText: {
    ...typography.bodyMedium,
    color: colors.darkGray,
    fontWeight: '800',
  },
  photoPlaceholderSubtext: {
    ...typography.bodySmall,
    color: colors.mediumGray,
    marginTop: 5,
  },
  captionArea: {
    paddingHorizontal: 5,
    minHeight: 40,
  },
  challengeText: {
    ...typography.bodyMedium,
    color: colors.darkBrown,
    textAlign: 'center',
    fontWeight: '700',
    marginBottom: 8,
  },
  captionText: {
    ...typography.bodySmall,
    color: colors.lightBrown,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  polaroidFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 10,
  },
  usernameStamp: {
    ...typography.stamp,
    color: colors.lightBrown,
    transform: [{ rotate: '-1deg' }],
  },
  dateStamp: {
    ...typography.stamp,
    color: colors.darkGray,
    transform: [{ rotate: '1deg' }],
  },
  primaryButton: {
    ...components.primaryButton,
    ...shadows.lightShadow,
    transform: [{ rotate: '0.5deg' }],
  },
  primaryButtonText: {
    ...typography.headerSmall,
    color: colors.polaroidWhite,
    textAlign: 'center',
  },
  secondaryButton: {
    ...components.secondaryButton,
    transform: [{ rotate: '-0.5deg' }],
  },
  secondaryButtonText: {
    ...typography.bodyMedium,
    color: colors.tan,
    textAlign: 'center',
    fontWeight: '700',
  },
  dangerButton: {
    ...components.dangerButton,
    transform: [{ rotate: '1deg' }],
  },
  dangerButtonText: {
    ...typography.bodyMedium,
    color: colors.polaroidWhite,
    textAlign: 'center',
    fontWeight: '800',
  },
  ghostButton: {
    ...components.ghostButton,
    transform: [{ rotate: '-0.5deg' }],
  },
  ghostButtonText: {
    ...typography.bodyLarge,
    color: colors.darkGray,
    textAlign: 'center',
  },
  failureContainer: {
    backgroundColor: colors.dustyRed,
    borderColor: colors.vintageRed,
    borderWidth: 2,
    padding: 20,
    transform: [{ rotate: '-1deg' }],
  },
  failureText: {
    ...typography.bodyMedium,
    color: colors.polaroidWhite,
    textAlign: 'center',
    fontWeight: '800',
  },
  cowardStamp: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: colors.vintageRed,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 2,
    borderColor: colors.dustyRed,
    transform: [{ rotate: '15deg' }],
  },
  cowardStampText: {
    ...typography.stamp,
    color: colors.polaroidWhite,
  },
  tapeHorizontal: {
    position: 'absolute',
    width: 40,
    height: 16,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    opacity: 0.8,
    borderRadius: 2,
  },
  tapeVertical: {
    position: 'absolute',
    width: 16,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    opacity: 0.8,
    borderRadius: 2,
  },
  tapeTopLeft: {
    top: -8,
    left: 20,
    transform: [{ rotate: '-5deg' }],
  },
  tapeTopRight: {
    top: -8,
    right: 20,
    transform: [{ rotate: '8deg' }],
  },
  tapeBottomLeft: {
    bottom: -8,
    left: 20,
    transform: [{ rotate: '5deg' }],
  },
  tapeBottomRight: {
    bottom: -8,
    right: 20,
    transform: [{ rotate: '-8deg' }],
  },
  galleryContainer: {
    flex: 1,
    paddingTop: 20,
  },
  galleryContent: {
    paddingHorizontal: 15,
    paddingBottom: 20,
  },
  galleryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  galleryItem: {
    flex: 0.48,
    marginBottom: 15,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    width: '85%',
    maxWidth: 400,
    position: 'relative',
    maxHeight: height * 0.9,
    overflow: 'visible',
  },
  closeButton: {
    position: 'absolute',
    top: -15,
    right: -15,
    width: 40,
    height: 40,
    backgroundColor: colors.lightBrown,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    borderWidth: 2,
    borderColor: colors.tan,
  },
  closeButtonText: {
    ...typography.headerMedium,
    color: colors.tan,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...typography.bodyMedium,
    color: colors.tan,
    marginTop: 10,
  },
  textInput: {
    backgroundColor: colors.offWhite,
    borderWidth: 1,
    borderColor: colors.mediumGray,
    padding: 12,
    marginVertical: 8,
    ...typography.bodyMedium,
    color: colors.darkBrown,
  },
  textInputFocused: {
    borderColor: colors.forestGreen,
    borderWidth: 2,
  },
  textCenter: {
    textAlign: 'center',
  },
  textLeft: {
    textAlign: 'left',
  },
  textRight: {
    textAlign: 'right',
  },
  rotateLeft: {
    transform: [{ rotate: '-1deg' }],
  },
  rotateRight: {
    transform: [{ rotate: '1deg' }],
  },
  rotateLeftStrong: {
    transform: [{ rotate: '-2deg' }],
  },
  rotateRightStrong: {
    transform: [{ rotate: '2deg' }],
  },
  iconImage: {
      width: 42,
      height: 42,
  },
  categoryContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      top: -15
  }, 
});

export { colors, typography, shadows, components };