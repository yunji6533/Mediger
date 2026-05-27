import boto3
from boto3.dynamodb.conditions import Key
from .config import AWS_REGION


#여기도 동일 dynamoDB 연결을 저장해두고 재사용
_resource = None


def get_resource():
    global _resource
    if _resource is None:
        _resource = boto3.resource('dynamodb', region_name=AWS_REGION)
    return _resource


def get_table(table_name: str):
    return get_resource().Table(table_name)
