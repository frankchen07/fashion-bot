declare module "expo-camera" {
    import { Component } from "react"
    import type { ViewProps } from "react-native"
  
    export interface CameraProps extends ViewProps {
      type: CameraType
      onCameraReady?: () => void
      onMountError?: (error: Error) => void
    }
  
    export enum CameraType {
      front = "front",
      back = "back",
    }
  
    export class Camera extends Component<CameraProps> {
      takePictureAsync(options?: CameraPictureOptions): Promise<CameraCapturedPicture>
    }
  
    export interface CameraPictureOptions {
      quality?: number
      base64?: boolean
      exif?: boolean
      onPictureSaved?: (picture: CameraCapturedPicture) => void
      skipProcessing?: boolean
    }
  
    export interface CameraCapturedPicture {
      uri: string
      width: number
      height: number
      exif?: { [name: string]: any }
      base64?: string
    }
  
    export function requestCameraPermissionsAsync(): Promise<{ status: "granted" | "denied" }>
  }
  
  // Add this line to declare the static methods on the Camera class
  declare module "expo-camera" {
    export class Camera {
      static requestCameraPermissionsAsync(): Promise<{ status: "granted" | "denied" }>
    }
  }
  
  