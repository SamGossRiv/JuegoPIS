import { room1 } from "../scenes/room1.js";
import { state, statePropsEnum } from "../state/globalStateManager.js";
import { healthBar } from "../ui/healthBar.js";
import { makeBlink } from "./entitySharedLogic.js";

export function makePlayer(k) {
  return k.make([
    k.pos(),
    k.sprite("player"),
    k.area({ shape: new k.Rect(k.vec2(0, 18), 12, 12) }),
    k.anchor("center"),
    k.body({ mass: 100, jumpForce: 320 }),
    k.doubleJump(state.current().isDoubleJumpUnlocked ? 2 : 1),
    k.opacity(),
    k.health(state.current().playerHp),
    "player",
    {
      speed: 150,
      isAttacking: false,
      setPosition(x, y) {
        this.pos.x = x;
        this.pos.y = y;
      },
      enablePassthrough() {
        this.onBeforePhysicsResolve((collision) => {
          if (collision.target.is("passthrough") && this.isJumping()) {
            collision.preventResolution();
          }
        });
      },
      setControls() {
        this.controlHandlers = [];

        this.controlHandlers.push(
          k.onKeyPress((key) => {
            if (key === "space") {
              if (this.curAnim() !== "jump") this.play("jump");
              this.doubleJump();
            }

            if (
              key === "z" &&
              this.curAnim() !== "attack"
            ) {
              this.isAttacking = true;
              this.add([
                k.pos(this.flipX ? -25 : 0, 10),
                k.area({ shape: new k.Rect(k.vec2(0), 25, 10) }),
                "sword-hitbox",
              ]);
              this.play("attack");

              this.onAnimEnd((anim) => {
                if (anim === "attack") {
                  const swordHitbox = k.get("sword-hitbox", {
                    recursive: true,
                  })[0];
                  if (swordHitbox) k.destroy(swordHitbox);
                  this.isAttacking = false;
                  this.play("idle");
                }
              });
            }
          })
        );

        this.controlHandlers.push(
          k.onKeyDown((key) => {
            if (key === "left" && !this.isAttacking) {
              if (this.curAnim() !== "run" && this.isGrounded()) {
                this.play("run");
              }
              this.flipX = true;
              this.move(-this.speed, 0);
              return;
            }

            if (key === "right" && !this.isAttacking) {
              if (this.curAnim() !== "run" && this.isGrounded()) {
                this.play("run");
              }
              this.flipX = false;
              this.move(this.speed, 0);
              return;
            }
          })
        );

        this.controlHandlers.push(
          k.onKeyRelease(() => {
            if (
              this.curAnim() !== "idle" &&
              this.curAnim() !== "jump" &&
              this.curAnim() !== "fall" &&
              this.curAnim() !== "attack"
            )
              this.play("idle");
          })
        );
      },

      disableControls() {
        for (const handler of this.controlHandlers) {
          handler.cancel();
        }
      },

      respawnIfOutOfBounds(boundValue, destinationName) {
        k.onUpdate(() => {
          if (this.pos.y > boundValue) {
            state.reset(); // Reiniciar el estado global
            k.go(destinationName, { reset: true }); // Reiniciar la escena
          }
        });
      },

      setEvents() {
        // cuando el jugador cae después de saltar
        this.onFall(() => {
          this.play("fall");
        });

        // cuando el jugador cae fuera de una plataforma
        this.onFallOff(() => {
          this.play("fall");
        });
        this.onGround(() => {
          this.play("idle");
        });
        this.onHeadbutt(() => {
          this.play("fall");
        });

        this.on("heal", () => {
          state.set(statePropsEnum.playerHp, this.hp());
          healthBar.trigger("update");
        });

        this.on("hurt", () => {
          makeBlink(k, this);

          if (this.hp() > 0) {
            // Si el jugador tiene vida, actualiza el estado y la UI
            state.set(statePropsEnum.playerHp, this.hp());
            healthBar.trigger("update");
            return;
          }

          // Si el jugador muere, reinicia el juego
          state.reset(); // Reiniciar el estado global
          healthBar.trigger("reset"); // Opcional: Reiniciar la UI
          k.go("room1", { reset: true });
        });
      },

      enableDoubleJump() {
        this.numJumps = 2;
      },
    },
  ]);
}
