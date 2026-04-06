import 'package:flutter/material.dart';

/// Wraps [child] with a spawn (scale + fade in) or removal (scale + fade out)
/// animation that completes in 350 ms.
///
/// Call [CardSpawnAnimationController.spawn] to trigger the enter animation and
/// [CardSpawnAnimationController.remove] to trigger the exit animation before
/// removing the widget from the tree.
class CardSpawnAnimation extends StatefulWidget {
  final Widget child;

  /// Called when the removal animation finishes so the parent can delete the card.
  final VoidCallback? onRemoved;

  const CardSpawnAnimation({
    super.key,
    required this.child,
    this.onRemoved,
  });

  @override
  State<CardSpawnAnimation> createState() => CardSpawnAnimationState();
}

class CardSpawnAnimationState extends State<CardSpawnAnimation>
    with SingleTickerProviderStateMixin {
  static const Duration _duration = Duration(milliseconds: 350);

  late final AnimationController _controller;
  late final Animation<double> _scale;
  late final Animation<double> _opacity;

  bool _removing = false;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: _duration);

    _scale = Tween<double>(begin: 0.4, end: 1.0).animate(
      CurvedAnimation(parent: _controller, curve: Curves.elasticOut),
    );

    _opacity = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeIn),
    );

    // Play spawn animation immediately.
    _controller.forward();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  /// Triggers the removal animation and calls [CardSpawnAnimation.onRemoved]
  /// when finished.
  Future<void> remove() async {
    if (_removing) return;
    _removing = true;
    await _controller.reverse();
    widget.onRemoved?.call();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        return Opacity(
          opacity: _opacity.value.clamp(0.0, 1.0),
          child: Transform.scale(
            scale: _scale.value,
            child: child,
          ),
        );
      },
      child: widget.child,
    );
  }
}
