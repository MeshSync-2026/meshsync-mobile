//load custom fonts
//wrap the whole app in the theme provider
//mount navigation

import { useTheme } from "@react-navigation/native";
import React, { useCallback } from 'react';
import {View} from 'react-native';
import {SafeAreaProvider } from 'react-native-safe-area-context';
import {StatusBar} from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import {useFonts,AtkinsonHyperlegible_400Regular,AtkinsonHyperlegible_700Bold} from '@expo-google-fonts/atkinson-hyperlegible';
import{ThemeProvider, usetheme } from './src/theme/ThemeContext';
import RootNavigator from './src/navigation/RootNavigator';

//keep the splash screen visible while fonts load
SplashScreen.preventAutoHideAsync().catch(() => {});

function AppShell(){
    const { colors, isdark}=useTheme();
    return (
        <View style={{flex:1,backgroundColor:colors.background}}>
            <StatusBar style={isdark?'light':'dark'}/>
            <RootNavigator/>
        </View>
    );
}

export default function App() {
    const [fontsLoaded] = useFonts({
        AtkinsonHyperlegible_400Regular,
        AtkinsonHyperlegible_700Bold,
    });

    const onLayoutRootView = useCallback(async () => {
        if (fontsLoaded) {
            await SplashScreen.hideAsync();
        }
    }, [fontsLoaded]);

    if (!fontsLoaded) {
        return null;  //still showing splash screen
    }

    return (
        <SafeAreaProvider onLayout={onLayoutRootView}>
            <ThemeProvider>
                <AppShell/>
            </ThemeProvider>
        </SafeAreaProvider>
    );
}

