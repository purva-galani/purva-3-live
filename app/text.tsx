import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Linking, Modal, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Query } from 'appwrite';
import { account, databases } from '../lib/appwrite';
import { styles } from '../constants/LoginScreen.styles';

const DATABASE_ID = '681c428b00159abb5e8b';
const COLLECTION_ID = '681c429800281e8a99bd';

const LoginScreen = () => {
    const params = useLocalSearchParams();
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [username, setUsername] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [forgotModalVisible, setForgotModalVisible] = useState(false);
    const [resetModalVisible, setResetModalVisible] = useState(false);
    const [forgotEmail, setForgotEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [resetConfirmPassword, setResetConfirmPassword] = useState('');
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    const [resetUserId, setResetUserId] = useState('');
    const [resetSecret, setResetSecret] = useState('');
    const [resetSuccess, setResetSuccess] = useState(false);

    const resetFields = () => {
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setUsername('');
        setForgotEmail('');
        setNewPassword('');
        setResetConfirmPassword('');
    };

    useEffect(() => {
    if (params?.resetPassword === 'true' && params.userId && params.secret) {
        setResetModalVisible(true);
        setResetUserId(params.userId as string);
        setResetSecret(params.secret as string);
    }
    }, [params]);

    useEffect(() => {
        const handleDeepLink = (event: { url: string }) => {
            const url = event.url;
            if (url.includes('reset-password')) {
                const params = new URLSearchParams(url.split('?')[1]);
                const userId = params.get('userId');
                const secret = params.get('secret');
                
                if (userId && secret) {
                    setResetModalVisible(true);
                    setResetUserId(userId);
                    setResetSecret(secret);
                }
            }
        };

        // Get the subscription object when adding the listener
        const subscription = Linking.addEventListener('url', handleDeepLink);
        
        // Check initial URL if app was launched from a deep link
        Linking.getInitialURL().then(url => {
            if (url) handleDeepLink({ url });
        });

        return () => {
            // Remove the listener using the subscription
            subscription.remove();
        };
    }, []);

   const handleLogin = async () => {
    if (email === '' || password === '') {
        Alert.alert('Error', 'Please fill in all fields');
    } else if (!emailRegex.test(email)) {
        Alert.alert('Error', 'Please enter a valid email');
    } else if (!passwordRegex.test(password)) {
        Alert.alert('Error', 'Password must contain an uppercase letter, number, and special character');
    } else {
        try {
            // First check if there's an active session
            try {
                const current = await account.get();
                if (current) {
                    await account.deleteSession('current');
                }
            } catch (error) {
                // No active session, proceed with login
            }
            
            // Create new session
            const session = await account.createEmailPasswordSession(email, password);
            console.log('Login Success:', session);
            
            // Get user details
            const user = await account.get();
            console.log('Current user:', user);
            
            // Check if user has admin label
            const isAdmin = user.labels?.includes('admin');
            
            Alert.alert('Success', `Logged in as ${email}`);
            resetFields();
            
            // Redirect based on admin status
            if (isAdmin) {
                router.replace('/home'); // Admin dashboard
            } else {
                router.replace('/userapp/home'); // User dashboard
            }
        } catch (error: any) {
            console.error('Login Error:', error);
            Alert.alert('Login Error', error?.message || 'An unknown error occurred');
        }
    }
};

    const handleRegister = async () => {
        if (!username || !email || !password || !confirmPassword) {
            Alert.alert('Error', 'Please fill in all fields');
        } else if (!emailRegex.test(email)) {
            Alert.alert('Error', 'Please enter a valid email');
        } else if (!passwordRegex.test(password)) {
            Alert.alert('Error', 'Password must contain an uppercase letter, number, and special character');
        } else if (password !== confirmPassword) {
            Alert.alert('Error', 'Passwords do not match');
        } else {
            try {
                await account.create('unique()', email, password, username);
                Alert.alert('Success', 'Account created successfully. Please log in.');
                resetFields();
                setIsLogin(true);

                  // Check if user exists in the database (added by admin)
            const response = await databases.listDocuments(
                DATABASE_ID, 
                COLLECTION_ID,
                [Query.equal('email', email)]
            );
                if (response.documents.length === 0) {
                // User not found in admin-added users
                await account.deleteSession('current');
                Alert.alert('Access Denied', 'You are not authorized to access this system');
                return;
            }
            } catch (error) {
                Alert.alert('Registration Error', error instanceof Error ? error.message : 'An unknown error occurred');
            }
        }
    };  
    
    const handleForgotPassword = () => {
        setForgotModalVisible(true);
    };

    const handleSendOTP = async () => {
        if (forgotEmail === '') {
            Alert.alert('Error', 'Please enter your email');
        } else if (!emailRegex.test(forgotEmail)) {
            Alert.alert('Error', 'Invalid email address');
        } else {
            try {
                const resetUrl = 'https://cloud.appwrite.io/v1/recovery';
                
                await account.createRecovery(forgotEmail, resetUrl);
                Alert.alert('Recovery Email Sent', `A password reset link has been sent to ${forgotEmail}. Please check your email.`);
                setForgotModalVisible(false);
                setForgotEmail('');
            } catch (error: any) {
                console.error('Recovery Error:', error);
                Alert.alert('Error', error?.message || 'Failed to send recovery email');
            }
        }
    };

    const handleResetPassword = async () => {
        if (!newPassword || !resetConfirmPassword) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }
        
        if (newPassword !== resetConfirmPassword) {
            Alert.alert('Error', 'Passwords do not match');
            return;
        }
        
        if (!passwordRegex.test(newPassword)) {
            Alert.alert('Error', 'Password must contain an uppercase letter, number, and special character');
            return;
        }

        try {
            if (!resetUserId || !resetSecret) {
                throw new Error('Invalid reset credentials');
            }
            
            await account.updateRecovery(resetUserId, resetSecret, newPassword);
            
            // Show success alert
            Alert.alert(
                'Success', 
                'Your password has been reset successfully',
                [
                    {
                        text: 'OK',
                        onPress: () => {
                            // Close modal and reset fields
                            setResetModalVisible(false);
                            resetFields();
                            setResetUserId('');
                            setResetSecret('');
                        }
                    }
                ]
            );
            
        } catch (error: any) {
            console.error('Password Reset Error:', error);
            Alert.alert('Error', error?.message || 'Failed to reset password');
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1 }}
        >
            <ScrollView 
                contentContainerStyle={styles.container}
                keyboardShouldPersistTaps="handled"
            >
                {/* Branding Header */}
                <View style={styles.brandContainer}>
                    <Image
                        source={require('../assets/images/logo.jpg')}
                        style={styles.logo}
                        resizeMode="contain"
                    />
                </View>

                {/* Forgot Password Modal */}
                <Modal transparent animationType="fade" visible={forgotModalVisible}>
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalCard}>
                            <Text style={styles.modalTitle}>Reset Password</Text>
                            <Text style={styles.modalSubtitle}>Enter your email to receive a recovery link</Text>
                            <TextInput
                                style={styles.modalInput}
                                placeholder="Email address"
                                placeholderTextColor="#999"
                                value={forgotEmail}
                                onChangeText={setForgotEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                            <View style={styles.modalButtonGroup}>
                                <TouchableOpacity 
                                    style={[styles.modalButton, styles.secondaryButton]}
                                    onPress={() => setForgotModalVisible(false)}
                                >
                                    <Text style={styles.secondaryButtonText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[styles.modalButton, styles.primaryButton]}
                                    onPress={handleSendOTP}
                                >
                                    <Text style={styles.primaryButtonText}>Send OTP</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>

                {/* Reset Password Modal */}
                <Modal transparent animationType="fade" visible={resetModalVisible}>
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalCard}>
                            <Text style={styles.modalTitle}>Set New Password</Text>

                            <View style={styles.inputContainer}>
                                <Text style={styles.inputLabel}>New Password</Text>
                                <View style={styles.passwordInputContainer}>
                                    <TextInput
                                        style={styles.passwordInput}
                                        placeholder="New Password"
                                        placeholderTextColor="#999"
                                        value={newPassword}
                                        onChangeText={setNewPassword}
                                        secureTextEntry={!showNewPassword}
                                    />
                                    <TouchableOpacity 
                                        style={styles.eyeIcon}
                                        onPress={() => setShowNewPassword(!showNewPassword)}
                                    >
                                        <Ionicons
                                            name={showNewPassword ? 'eye' : 'eye-off'}
                                            size={20}
                                            color="#888"
                                        />
                                    </TouchableOpacity>
                                </View>
                            </View>
                                
                            <View style={styles.inputContainer}>
                                <Text style={styles.inputLabel}>Confirm Password</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Confirm password"
                                    placeholderTextColor="#999"
                                    value={resetConfirmPassword}
                                    onChangeText={setResetConfirmPassword}
                                    secureTextEntry={true}
                                />
                            </View>
                            
                            <View style={styles.modalButtonGroup}>
                                <TouchableOpacity 
                                    style={[styles.modalButton, styles.secondaryButton]}
                                    onPress={() => {
                                        setResetModalVisible(false);
                                        resetFields();
                                        setResetUserId('');
                                        setResetSecret('');
                                    }}
                                >
                                    <Text style={styles.secondaryButtonText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[styles.modalButton, styles.primaryButton]}
                                    onPress={handleResetPassword}
                                >
                                    <Text style={styles.primaryButtonText}>Update Password</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>

                {/* Auth Form */}
                <View style={styles.authCard}>
                    <Text style={styles.authTitle}>
                        {isLogin ? 'Welcome Back' : 'Create Account'}
                    </Text>
                    {!isLogin && (
                        <View style={styles.inputContainer}>
                            <Text style={styles.inputLabel}>Username</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter your username"
                                placeholderTextColor="#999"
                                value={username}
                                onChangeText={setUsername}
                            />
                        </View>
                    )}
                    
                    <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>Email Address</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter your email"
                            placeholderTextColor="#999"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                    </View>

                {/* Improved Password Input Section */}
                <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Password</Text>
                    <View style={styles.passwordInputContainer}>
                        <TextInput
                            style={styles.passwordInput}
                            placeholder="Enter your password"
                            placeholderTextColor="#999"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry={!showPassword}
                        />
                        <TouchableOpacity 
                            style={styles.eyeIcon}
                            onPress={() => setShowPassword(!showPassword)}
                        >
                            <Ionicons
                                name={showPassword ? 'eye' : 'eye-off'}
                                size={20}
                                color="#888"
                            />
                        </TouchableOpacity>
                    </View>
                </View>
                    
                    {!isLogin && (
                        <View style={styles.inputContainer}>
                            <Text style={styles.inputLabel}>Confirm Password</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Confirm your password"
                                placeholderTextColor="#999"
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                secureTextEntry={true}
                            />
                        </View>
                    )}
                    
                    {isLogin && (
                        <TouchableOpacity 
                            style={styles.forgotPasswordButton}
                            onPress={handleForgotPassword}
                        >
                            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                        </TouchableOpacity>
                    )}
                    
                    <TouchableOpacity
                        style={styles.authButton}
                        onPress={isLogin ? handleLogin : handleRegister}
                    >
                        <Text style={styles.authButtonText}>
                            {isLogin ? 'Sign In' : 'Sign Up'}
                        </Text>
                    </TouchableOpacity>
                    
                    <View style={styles.authFooter}>
                        <Text style={styles.authFooterText}>
                            {isLogin ? "Don't have an account?" : "Already have an account?"}
                        </Text>
                        <TouchableOpacity
                            onPress={() => {
                                setIsLogin(!isLogin);
                                resetFields();
                            }}
                        >
                            <Text style={styles.authFooterLink}>
                                {isLogin ? 'Sign Up' : 'Sign In'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

export default LoginScreen;