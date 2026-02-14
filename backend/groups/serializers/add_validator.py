from rest_framework import serializers

class AddValidatorSerializer(serializers.Serializer):
    validator_phone_number = serializers.CharField(max_length=20)
    