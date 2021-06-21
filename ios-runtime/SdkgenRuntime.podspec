Pod::Spec.new do |spec|  
  spec.name                    = 'SdkgenRuntime'
  spec.version                 = '0.1.0'
  spec.summary                 = 'Cubos sdkgen.'

  spec.author                  = 'Cubos'
  spec.license                 = { :type => "Copyright", :text => "Copyright 2020 Cubos. All Rights Reserved." }
  spec.homepage                = "https://github.com/sdkgen/sdkgen"

  spec.platform                = :ios
  # s.source                  = { :http => 'https://storage.googleapis.com/aarin-ios-framework/aarin-1.0.2.zip' }
  spec.source                  = { :http => 'file:' + __dir__ + '/sdkgen-0.1.0.zip' }

  spec.source_files = 'SdkgenRuntime/Classes/**/*'

  spec.platform = :ios
  spec.ios.deployment_target = '12.1'
  spec.swift_version = "5.0"

  spec.dependency 'Alamofire', "~> 5.4"
  spec.dependency 'KeychainSwift'

end 
