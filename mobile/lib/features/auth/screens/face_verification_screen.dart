import 'dart:async';
import 'dart:io';
import 'dart:typed_data';

import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_mlkit_face_detection/google_mlkit_face_detection.dart';

import 'email_verification_screen.dart';

class FaceVerificationScreen extends StatefulWidget {
  const FaceVerificationScreen({super.key, required this.email});

  final String email;

  @override
  State<FaceVerificationScreen> createState() => _FaceVerificationScreenState();
}

class _FaceVerificationScreenState extends State<FaceVerificationScreen>
    with WidgetsBindingObserver {
  final FaceDetector _faceDetector = FaceDetector(
    options: FaceDetectorOptions(
      enableClassification: true,
      enableTracking: true,
      performanceMode: FaceDetectorMode.fast,
      minFaceSize: 0.15,
    ),
  );

  CameraController? _cameraController;
  XFile? _selfie;
  bool _consentGiven = false;
  bool _isInitializing = false;
  bool _isCapturing = false;
  bool _isProcessingFrame = false;
  bool _cameraReady = false;
  bool _hasOneCenteredFace = false;
  bool _eyesWereOpen = false;
  bool _eyesClosedAfterOpen = false;
  bool _blinkDetected = false;
  bool _headTurned = false;
  bool _headReturned = false;
  bool _livenessComplete = false;
  double? _initialHeadAngle;
  DateTime _lastFrameProcessed = DateTime.fromMillisecondsSinceEpoch(0);
  String? _cameraError;
  String _guidance = 'Autoriza la cámara y centra tu rostro en la guía.';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    final controller = _cameraController;
    if (controller == null || !controller.value.isInitialized) return;
    if (state == AppLifecycleState.inactive ||
        state == AppLifecycleState.paused) {
      _stopCamera();
    } else if (state == AppLifecycleState.resumed &&
        _consentGiven &&
        _selfie == null) {
      _initializeCamera();
    }
  }

  Future<void> _initializeCamera() async {
    if (_isInitializing) return;
    setState(() {
      _isInitializing = true;
      _cameraError = null;
    });

    try {
      final existingController = _cameraController;
      if (existingController != null &&
          existingController.value.isInitialized) {
        if (!existingController.value.isStreamingImages) {
          await existingController.startImageStream(_processCameraFrame);
        }
        if (!mounted) return;
        setState(() => _cameraReady = true);
        return;
      }

      final cameras = await availableCameras();
      CameraDescription? frontCamera;
      for (final camera in cameras) {
        if (camera.lensDirection == CameraLensDirection.front) {
          frontCamera = camera;
          break;
        }
      }
      if (frontCamera == null) {
        throw StateError(
            'Este dispositivo no tiene cámara frontal disponible.');
      }

      final controller = CameraController(
        frontCamera,
        ResolutionPreset.medium,
        enableAudio: false,
        imageFormatGroup: Platform.isAndroid
            ? ImageFormatGroup.nv21
            : ImageFormatGroup.bgra8888,
      );
      _cameraController = controller;
      await controller.initialize();
      if (!mounted || !_consentGiven) {
        await controller.dispose();
        _cameraController = null;
        return;
      }

      await controller.startImageStream(_processCameraFrame);
      setState(() {
        _cameraReady = true;
        _guidance = 'Centra tu rostro y parpadea o gira suavemente la cabeza.';
      });
    } on CameraException catch (error) {
      if (!mounted) return;
      setState(() {
        _cameraError = error.description ??
            'No se pudo acceder a la cámara. Revisa los permisos del dispositivo.';
      });
    } catch (error) {
      if (!mounted) return;
      setState(() => _cameraError = error.toString());
    } finally {
      if (mounted) setState(() => _isInitializing = false);
    }
  }

  Future<void> _stopCamera() async {
    final controller = _cameraController;
    if (controller == null) return;
    try {
      if (controller.value.isStreamingImages) {
        await controller.stopImageStream();
      }
      if (mounted) setState(() => _cameraReady = false);
    } on CameraException catch (error) {
      if (mounted) {
        setState(() => _cameraError = error.description ?? error.code);
      }
    }
  }

  Future<void> _releaseCamera() async {
    final controller = _cameraController;
    _cameraController = null;
    if (controller != null) {
      try {
        if (controller.value.isStreamingImages) {
          await controller.stopImageStream();
        }
        await controller.dispose();
      } on CameraException catch (error) {
        if (mounted) {
          setState(() {
            _cameraError = error.description ?? 'No se pudo liberar la cámara.';
          });
        }
      }
    }
    if (mounted) setState(() => _cameraReady = false);
  }

  InputImage? _inputImageFromCameraImage(
    CameraImage image,
    CameraController controller,
  ) {
    final camera = controller.description;
    final deviceOrientation = controller.value.deviceOrientation;
    const orientationDegrees = {
      DeviceOrientation.portraitUp: 0,
      DeviceOrientation.landscapeLeft: 90,
      DeviceOrientation.portraitDown: 180,
      DeviceOrientation.landscapeRight: 270,
    };
    final orientation = orientationDegrees[deviceOrientation];
    if (orientation == null) return null;

    final rotationDegrees = camera.lensDirection == CameraLensDirection.front
        ? (camera.sensorOrientation + orientation) % 360
        : (camera.sensorOrientation - orientation + 360) % 360;
    final rotation = InputImageRotationValue.fromRawValue(rotationDegrees);
    final format = InputImageFormatValue.fromRawValue(image.format.raw);
    if (rotation == null || format == null || image.planes.isEmpty) return null;
    if (Platform.isAndroid && format != InputImageFormat.nv21) return null;
    if (Platform.isIOS && format != InputImageFormat.bgra8888) return null;

    final bytes = BytesBuilder(copy: false);
    for (final plane in image.planes) {
      bytes.add(plane.bytes);
    }
    return InputImage.fromBytes(
      bytes: bytes.toBytes(),
      metadata: InputImageMetadata(
        size: Size(image.width.toDouble(), image.height.toDouble()),
        rotation: rotation,
        format: format,
        bytesPerRow: image.planes.first.bytesPerRow,
      ),
    );
  }

  Future<void> _processCameraFrame(CameraImage image) async {
    final now = DateTime.now();
    if (_isProcessingFrame ||
        _selfie != null ||
        now.difference(_lastFrameProcessed).inMilliseconds < 300) {
      return;
    }
    _lastFrameProcessed = now;
    final controller = _cameraController;
    if (controller == null) return;
    final inputImage = _inputImageFromCameraImage(image, controller);
    if (inputImage == null) {
      if (mounted && _cameraError == null) {
        setState(() {
          _cameraError =
              'El formato de cámara de este dispositivo no es compatible.';
        });
      }
      return;
    }

    _isProcessingFrame = true;
    try {
      final faces = await _faceDetector.processImage(inputImage);
      if (!mounted) return;
      if (faces.length != 1) {
        _resetLiveness();
        setState(() {
          _hasOneCenteredFace = false;
          _guidance = faces.isEmpty
              ? 'No se detecta un rostro. Colócate frente a la cámara.'
              : 'Debe aparecer una sola persona en la imagen.';
        });
        return;
      }

      final face = faces.single;
      final size = inputImage.metadata!.size;
      final rotatedSize = inputImage.metadata!.rotation ==
                  InputImageRotation.rotation90deg ||
              inputImage.metadata!.rotation == InputImageRotation.rotation270deg
          ? Size(size.height, size.width)
          : size;
      final center = face.boundingBox.center;
      final centered = center.dx > rotatedSize.width * 0.2 &&
          center.dx < rotatedSize.width * 0.8 &&
          center.dy > rotatedSize.height * 0.15 &&
          center.dy < rotatedSize.height * 0.85;

      final leftEye = face.leftEyeOpenProbability;
      final rightEye = face.rightEyeOpenProbability;
      if (leftEye != null && rightEye != null) {
        final eyesOpen = leftEye > 0.65 && rightEye > 0.65;
        final eyesClosed = leftEye < 0.3 && rightEye < 0.3;
        if (eyesOpen) {
          _eyesWereOpen = true;
          if (_eyesClosedAfterOpen) _blinkDetected = true;
        } else if (eyesClosed && _eyesWereOpen) {
          _eyesClosedAfterOpen = true;
        }
      }

      final yaw = face.headEulerAngleY;
      if (yaw != null) {
        _initialHeadAngle ??= yaw;
        if ((yaw - _initialHeadAngle!).abs() >= 15) {
          _headTurned = true;
        } else if (_headTurned && (yaw - _initialHeadAngle!).abs() <= 7) {
          _headReturned = true;
        }
      }

      _livenessComplete = _blinkDetected || _headReturned;
      setState(() {
        _hasOneCenteredFace = centered;
        _guidance = !centered
            ? 'Alinea tu rostro dentro de la guía.'
            : _livenessComplete
                ? 'Comprobación básica completada. Ya puedes tomarte la selfie.'
                : _eyesWereOpen && !_eyesClosedAfterOpen && !_headTurned
                    ? 'Parpadea una vez o gira suavemente la cabeza y vuelve al centro.'
                    : 'Mantén un solo rostro y termina el movimiento para continuar.';
      });
    } catch (error) {
      if (mounted) {
        setState(() => _cameraError = 'No se pudo analizar la cámara: $error');
      }
    } finally {
      _isProcessingFrame = false;
    }
  }

  Future<void> _takeSelfie() async {
    final controller = _cameraController;
    if (controller == null ||
        !_hasOneCenteredFace ||
        !_livenessComplete ||
        _isCapturing) {
      return;
    }
    setState(() => _isCapturing = true);
    try {
      if (controller.value.isStreamingImages) {
        await controller.stopImageStream();
      }
      final selfie = await controller.takePicture();
      final faces = await _faceDetector.processImage(
        InputImage.fromFilePath(selfie.path),
      );
      if (faces.length != 1) {
        await File(selfie.path).delete();
        if (!mounted) return;
        setState(() {
          _guidance = faces.isEmpty
              ? 'No se detectó un rostro en la foto. Inténtalo otra vez.'
              : 'La foto debe mostrar solo un rostro. Inténtalo otra vez.';
          _isCapturing = false;
        });
        await controller.startImageStream(_processCameraFrame);
        return;
      }
      if (!mounted) {
        await File(selfie.path).delete();
        return;
      }
      setState(() {
        _selfie = selfie;
        _guidance =
            'La selfie se revisó en este dispositivo. No confirma tu identidad.';
        _isCapturing = false;
      });
    } on CameraException catch (error) {
      if (!mounted) return;
      setState(() {
        _cameraError = error.description ?? 'No se pudo tomar la selfie.';
        _isCapturing = false;
      });
      if (controller.value.isInitialized &&
          !controller.value.isStreamingImages) {
        await controller.startImageStream(_processCameraFrame);
      }
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _cameraError = 'No se pudo completar la selfie: $error';
        _isCapturing = false;
      });
    }
  }

  Future<void> _retakeSelfie() async {
    final selfie = _selfie;
    if (selfie != null) await File(selfie.path).delete();
    if (!mounted) return;
    _resetLiveness();
    setState(() {
      _selfie = null;
      _guidance = 'Centra tu rostro y parpadea o gira suavemente la cabeza.';
      _cameraError = null;
    });
    final controller = _cameraController;
    if (controller != null && controller.value.isInitialized) {
      await controller.startImageStream(_processCameraFrame);
      setState(() => _cameraReady = true);
    } else {
      await _initializeCamera();
    }
  }

  void _resetLiveness() {
    _hasOneCenteredFace = false;
    _eyesWereOpen = false;
    _eyesClosedAfterOpen = false;
    _blinkDetected = false;
    _headTurned = false;
    _headReturned = false;
    _livenessComplete = false;
    _initialHeadAngle = null;
  }

  Future<void> _continue() async {
    final selfie = _selfie;
    if (selfie == null) return;
    await _releaseCamera();
    try {
      await File(selfie.path).delete();
    } on FileSystemException {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'La selfie temporal no se pudo eliminar; el sistema la retirará de la caché.',
            ),
          ),
        );
      }
    }
    if (!mounted) return;
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => EmailVerificationScreen(email: widget.email),
      ),
    );
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    final controller = _cameraController;
    if (controller != null) {
      unawaited(controller.dispose());
    }
    unawaited(_faceDetector.close());
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final selfie = _selfie;
    final canTakeSelfie = _cameraReady &&
        _hasOneCenteredFace &&
        _livenessComplete &&
        !_isCapturing;

    return Scaffold(
      appBar: AppBar(title: const Text('Verificación facial')),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
          children: [
            Text(
              'Comprobación básica de rostro',
              style: theme.textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Es una comprobación adicional con detección local y una prueba de movimiento. No verifica que el rostro pertenezca al titular del DNI ni es una validación de RENIEC.',
              style: theme.textTheme.bodyMedium?.copyWith(height: 1.4),
            ),
            const SizedBox(height: 16),
            Container(
              height: 330,
              decoration: BoxDecoration(
                color:
                    isDark ? const Color(0xFF171717) : const Color(0xFFE9EDF2),
                borderRadius: BorderRadius.circular(24),
              ),
              clipBehavior: Clip.antiAlias,
              child: selfie != null
                  ? Image.file(File(selfie.path), fit: BoxFit.cover)
                  : _cameraPreview(),
            ),
            const SizedBox(height: 14),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: theme.colorScheme.primary.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(Icons.face_retouching_natural_rounded,
                      color: theme.colorScheme.primary),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      _cameraError ?? _guidance,
                      style: theme.textTheme.bodyMedium,
                    ),
                  ),
                ],
              ),
            ),
            if (selfie == null) ...[
              const SizedBox(height: 12),
              CheckboxListTile(
                value: _consentGiven,
                onChanged: (value) {
                  setState(() => _consentGiven = value ?? false);
                  if (_consentGiven && !_cameraReady) _initializeCamera();
                  if (!_consentGiven) _releaseCamera();
                },
                contentPadding: EdgeInsets.zero,
                controlAffinity: ListTileControlAffinity.leading,
                title: const Text(
                  'Acepto usar la cámara para esta comprobación local. La selfie no se envía al servidor.',
                  style: TextStyle(fontSize: 13),
                ),
              ),
            ],
            const SizedBox(height: 12),
            if (selfie == null)
              FilledButton.icon(
                onPressed: canTakeSelfie ? _takeSelfie : null,
                icon: _isCapturing
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.camera_alt_outlined),
                label: Text(_isCapturing ? 'Revisando...' : 'Tomar selfie'),
              )
            else ...[
              OutlinedButton.icon(
                onPressed: _retakeSelfie,
                icon: const Icon(Icons.refresh_rounded),
                label: const Text('Repetir fotografía'),
              ),
              const SizedBox(height: 8),
              FilledButton(
                onPressed: _continue,
                child: const Text('Continuar'),
              ),
            ],
            if (_isInitializing) ...[
              const SizedBox(height: 12),
              const LinearProgressIndicator(),
            ],
            if (_cameraError != null && _consentGiven && selfie == null)
              TextButton.icon(
                onPressed: _initializeCamera,
                icon: const Icon(Icons.refresh_rounded),
                label: const Text('Intentar de nuevo'),
              ),
          ],
        ),
      ),
    );
  }

  Widget _cameraPreview() {
    final controller = _cameraController;
    if (!_consentGiven) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(24),
          child: Text(
            'La cámara frontal se activará cuando aceptes el uso local de la imagen.',
            textAlign: TextAlign.center,
          ),
        ),
      );
    }
    if (controller == null || !controller.value.isInitialized) {
      return const Center(child: CircularProgressIndicator());
    }

    return Stack(
      fit: StackFit.expand,
      children: [
        CameraPreview(controller),
        CustomPaint(
          painter: _FaceGuidePainter(
            color: _livenessComplete ? const Color(0xFF10B981) : Colors.white,
          ),
        ),
      ],
    );
  }
}

class _FaceGuidePainter extends CustomPainter {
  const _FaceGuidePainter({required this.color});

  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final ovalRect = Rect.fromCenter(
      center: center,
      width: size.width * 0.62,
      height: size.height * 0.72,
    );
    final shade = Paint()..color = Colors.black.withValues(alpha: 0.28);
    final clear = Path()..addOval(ovalRect);
    final full = Path()..addRect(Offset.zero & size);
    canvas.drawPath(
      Path.combine(PathOperation.difference, full, clear),
      shade,
    );
    canvas.drawOval(
      ovalRect,
      Paint()
        ..color = color
        ..style = PaintingStyle.stroke
        ..strokeWidth = 3,
    );
  }

  @override
  bool shouldRepaint(covariant _FaceGuidePainter oldDelegate) =>
      oldDelegate.color != color;
}
