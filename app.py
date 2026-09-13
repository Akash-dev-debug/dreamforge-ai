import os
import time
import uuid
import requests

from flask import (
    Flask,
    render_template,
    request,
    jsonify,
    send_from_directory
)

from dotenv import load_dotenv


# =========================================================
# CONFIG
# =========================================================

load_dotenv()

app = Flask(__name__)

API_KEY = os.getenv(
    "AI_HORDE_API_KEY",
    "0000000000"
).strip()

BASE_URL = "https://stablehorde.net/api"

IMAGE_FOLDER = "generated_images"

os.makedirs(
    IMAGE_FOLDER,
    exist_ok=True
)

HEADERS = {
    "apikey": API_KEY,
    "Content-Type": "application/json",
    "Client-Agent": "DreamForgeAI:1.0"
}


# =========================================================
# HOME
# =========================================================

@app.route("/")
def home():
    return render_template("index.html")


# =========================================================
# SERVE SAVED IMAGES
# =========================================================

@app.route("/generated/<filename>")
def generated_image(filename):

    return send_from_directory(
        IMAGE_FOLDER,
        filename
    )


# =========================================================
# GALLERY
# =========================================================

@app.route("/gallery")
def gallery():

    try:

        images = []

        for filename in os.listdir(IMAGE_FOLDER):

            if filename.lower().endswith(
                (".png", ".jpg", ".jpeg", ".webp")
            ):

                filepath = os.path.join(
                    IMAGE_FOLDER,
                    filename
                )

                images.append({
                    "filename": filename,
                    "url": f"/generated/{filename}",
                    "created": os.path.getmtime(filepath)
                })


        images.sort(
            key=lambda item: item["created"],
            reverse=True
        )


        return jsonify({
            "success": True,
            "images": images
        })


    except Exception as error:

        print(
            "GALLERY ERROR:",
            repr(error)
        )

        return jsonify({
            "success": False,
            "error": "Could not load gallery."
        }), 500


# =========================================================
# GENERATE IMAGE
# =========================================================

@app.route(
    "/generate",
    methods=["POST"]
)
def generate():

    try:

        data = request.get_json() or {}

        prompt = str(
            data.get("prompt", "")
        ).strip()


        if not prompt:

            return jsonify({
                "success": False,
                "error": "Please enter a prompt."
            }), 400


        # Small free-safe generation
        width = 512
        height = 512
        steps = 10


        final_prompt = (
            f"{prompt}, "
            "high quality, highly detailed, "
            "beautiful lighting, "
            "professional composition"
        )


        payload = {

            "prompt": final_prompt,

            "params": {

                "width": width,
                "height": height,
                "steps": steps,
                "n": 1,
                "cfg_scale": 7.0,

                "negative_prompt":
                    "blurry, low quality, distorted, "
                    "watermark, logo, text"

            },

            "nsfw": False,
            "shared": False
        }


        print()
        print("================================")
        print("DREAMFORGE AI")
        print("================================")
        print("Prompt:", prompt)
        print("Size:", width, "x", height)
        print("Steps:", steps)
        print("================================")


        # -------------------------------------------------
        # START GENERATION
        # -------------------------------------------------

        response = requests.post(

            f"{BASE_URL}/v2/generate/async",

            json=payload,

            headers=HEADERS,

            timeout=30
        )


        print(
            "HORDE START:",
            response.status_code
        )

        print(
            "HORDE RESPONSE:",
            response.text
        )


        if response.status_code != 202:

            return jsonify({

                "success": False,

                "error":
                    "AI Horde rejected the request.",

                "details":
                    response.text

            }), response.status_code


        start_data = response.json()

        job_id = start_data.get("id")


        if not job_id:

            return jsonify({

                "success": False,

                "error":
                    "No generation ID received."

            }), 502


        print(
            "JOB ID:",
            job_id
        )


        # -------------------------------------------------
        # WAIT FOR GENERATION
        # -------------------------------------------------

        start_time = time.time()

        max_wait = 300


        while (
            time.time() - start_time
            < max_wait
        ):

            time.sleep(4)


            check = requests.get(

                f"{BASE_URL}"
                f"/v2/generate/check/{job_id}",

                headers=HEADERS,

                timeout=30
            )


            if check.status_code != 200:

                continue


            status = check.json()


            print(
                "WAIT:",
                status.get("wait_time"),
                "| DONE:",
                status.get("done")
            )


            if status.get("faulted"):

                return jsonify({

                    "success": False,

                    "error":
                        "AI generation failed."

                }), 502


            if status.get("done"):


                # -----------------------------------------
                # GET FINAL IMAGE
                # -----------------------------------------

                result = requests.get(

                    f"{BASE_URL}"
                    f"/v2/generate/status/{job_id}",

                    headers=HEADERS,

                    timeout=30
                )


                if result.status_code != 200:

                    return jsonify({

                        "success": False,

                        "error":
                            "Could not retrieve image."

                    }), 502


                result_data = result.json()


                generations = result_data.get(
                    "generations",
                    []
                )


                if not generations:

                    return jsonify({

                        "success": False,

                        "error":
                            "No image was generated."

                    }), 502


                remote_url = generations[0].get(
                    "img"
                )


                if not remote_url:

                    return jsonify({

                        "success": False,

                        "error":
                            "Image URL was missing."

                    }), 502


                # -----------------------------------------
                # DOWNLOAD IMAGE
                # -----------------------------------------

                image_response = requests.get(

                    remote_url,

                    timeout=60
                )


                if image_response.status_code != 200:

                    return jsonify({

                        "success": False,

                        "error":
                            "Could not download generated image."

                    }), 502


                # -----------------------------------------
                # SAVE IMAGE
                # -----------------------------------------

                filename = (
                    f"{uuid.uuid4().hex}.webp"
                )


                filepath = os.path.join(
                    IMAGE_FOLDER,
                    filename
                )


                with open(
                    filepath,
                    "wb"
                ) as image_file:

                    image_file.write(
                        image_response.content
                    )


                print(
                    "IMAGE SAVED:",
                    filename
                )


                # -----------------------------------------
                # RETURN LOCAL IMAGE
                # -----------------------------------------

                return jsonify({

                    "success": True,

                    "image":
                        f"/generated/{filename}",

                    "prompt":
                        prompt,

                    "filename":
                        filename

                })


        # -------------------------------------------------
        # TIMEOUT
        # -------------------------------------------------

        return jsonify({

            "success": False,

            "error":
                "Generation timed out. Please try again."

        }), 504


    except requests.RequestException as error:

        print(
            "NETWORK ERROR:",
            repr(error)
        )

        return jsonify({

            "success": False,

            "error":
                "Could not connect to AI Horde."

        }), 503


    except Exception as error:

        print(
            "SERVER ERROR:",
            repr(error)
        )

        return jsonify({

            "success": False,

            "error":
                "Something went wrong.",

            "details":
                str(error)

        }), 500


# =========================================================
# START SERVER
# =========================================================

if __name__ == "__main__":

    app.run(
        host="127.0.0.1",
        port=5000,
        debug=True
    )