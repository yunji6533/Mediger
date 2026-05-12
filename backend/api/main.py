from fastapi import FastAPI

app = FastAPI()

@app.get('/')
def root():
    return {'message': 'Mediger API is running'}

